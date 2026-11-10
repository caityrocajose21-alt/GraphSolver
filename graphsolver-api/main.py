"""API de reconocimiento de grafos con Gemini; la clave permanece en el servidor."""
import json
import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from PIL import Image, ImageOps, UnidentifiedImageError

app = FastAPI(title="GraphSolver Gemini Vision API")

origins = [
    value.strip().rstrip("/")
    for value in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if value.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

PROMPT = """
Analiza la fotografía o captura de un grafo matemático de teoría de grafos.
Devuelve ÚNICAMENTE un objeto JSON con esta estructura:
{
  "nodes": [
    {"id": "identificador_unico", "label": "etiqueta_visible",
     "x": 0.0, "y": 0.0}
  ],
  "edges": [
    {"source": "id_origen", "target": "id_destino", "weight": 3}
  ],
  "directed": false
}

Reglas obligatorias:
- Identifica únicamente nodos (vértices) que sean visualmente distinguibles.
- x e y son posiciones relativas entre 0 y 1, medidas desde la esquina
  superior izquierda de la imagen.
- Cada arista debe estar respaldada por una línea o flecha visible que una
  directamente sus dos nodos. Un cruce de líneas SIN un nodo dibujado no
  constituye una conexión.
- NO inventes nodos, aristas, direcciones ni pesos.
- Lee un peso numérico únicamente si es claramente legible y está asociado
  a esa arista. Si no hay peso o existe duda, usa null.
- Si una etiqueta no se puede leer, asigna una etiqueta provisional como N1.
- Si la conexión entre dos nodos es ambigua, omite esa arista en lugar de
  adivinarla.
- "directed" será true solo si las flechas son claramente visibles y el grafo
  se representa como dirigido. Si no se puede determinar, usa false.
- No uses 1 como peso predeterminado. Nunca sustituyas un peso dudoso por 1.
- Reconoce dibujos manuscritos y digitales, líneas rectas y curvas, círculos
  rellenos o sin relleno y etiquetas cercanas a las aristas.
- Devuelve JSON válido, sin Markdown, comentarios ni texto adicional.
"""

MAX_IMAGE_BYTES = 6_000_000
MAX_NODES = 100
MAX_EDGES = 500


@app.get("/health")
async def health():
    return {"ok": True, "provider": "gemini"}


@app.post("/analyze")
async def analyze(image: UploadFile = File(...)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(503, "Configura GEMINI_API_KEY en las variables de entorno de Render.")

    if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(415, "Solo se admiten imágenes JPEG, PNG o WebP.")

    raw = await image.read(MAX_IMAGE_BYTES + 1)
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "La imagen supera 6 MB.")

    try:
        with Image.open(BytesIO(raw)) as original:
            original.verify()
        with Image.open(BytesIO(raw)) as original:
            normalized = ImageOps.exif_transpose(original).convert("RGB")
            normalized.thumbnail((1600, 1600))
            output = BytesIO()
            normalized.save(output, format="JPEG", quality=88, optimize=True)
            image_bytes = output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "No se pudo leer la imagen.")

    model = os.getenv("GEMINI_VISION_MODEL", "gemini-2.5-flash")
    try:
        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(
            model=model,
            contents=[
                PROMPT,
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0,
                max_output_tokens=6000,
            ),
        )
        text = response.text
        if not text:
            raise ValueError("El modelo devolvió una respuesta vacía.")
        data = json.loads(text)
    except Exception as exc:
        # No exponer claves ni detalles internos del proveedor al navegador.
        message = str(exc).lower()
        if "quota" in message or "resource_exhausted" in message or "429" in message:
            raise HTTPException(
                429,
                "Se alcanzó el límite gratuito de Gemini. Espera a que se renueve la cuota e inténtalo de nuevo.",
            )
        if "api_key" in message or "unauthorized" in message or "permission" in message or "401" in message or "403" in message:
            raise HTTPException(
                502,
                "Gemini rechazó la clave o el acceso al modelo. Revisa GEMINI_API_KEY y GEMINI_VISION_MODEL en Render.",
            )
        raise HTTPException(
            502,
            "No se pudo completar el análisis con Gemini. Revisa los registros de Render y el modelo configurado.",
        )

    if not isinstance(data, dict) or not isinstance(data.get("nodes"), list) or not isinstance(data.get("edges"), list):
        raise HTTPException(502, "Gemini devolvió una estructura incompleta.")

    if len(data["nodes"]) > MAX_NODES or len(data["edges"]) > MAX_EDGES:
        raise HTTPException(422, "La imagen contiene demasiados elementos para este prototipo.")

    # Validación estricta para impedir referencias inventadas o pesos inválidos.
    node_ids = set()
    for node in data["nodes"]:
        if not isinstance(node, dict):
            raise HTTPException(502, "Gemini devolvió un nodo inválido.")
        node_id = str(node.get("id", "")).strip()
        if not node_id or node_id in node_ids:
            raise HTTPException(502, "Gemini devolvió identificadores de nodos vacíos o repetidos.")
        try:
            x, y = float(node["x"]), float(node["y"])
        except (KeyError, TypeError, ValueError):
            raise HTTPException(502, "Gemini devolvió posiciones de nodos inválidas.")
        if not (0 <= x <= 1 and 0 <= y <= 1):
            raise HTTPException(502, "Las coordenadas de los nodos están fuera de rango.")
        node["id"] = node_id
        node["label"] = str(node.get("label") or node_id)[:40]
        node["x"], node["y"] = x, y
        node_ids.add(node_id)

    for edge in data["edges"]:
        if not isinstance(edge, dict):
            raise HTTPException(502, "Gemini devolvió una arista inválida.")
        source, target = str(edge.get("source", "")), str(edge.get("target", ""))
        if source not in node_ids or target not in node_ids or source == target:
            raise HTTPException(502, "Gemini devolvió una arista con nodos inexistentes.")
        weight = edge.get("weight")
        if weight is not None:
            try:
                edge["weight"] = float(weight)
            except (TypeError, ValueError):
                raise HTTPException(502, "Gemini devolvió un peso no numérico.")
        else:
            edge["weight"] = None

    data["directed"] = bool(data.get("directed", False))
    return data
