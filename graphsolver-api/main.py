"""API opcional para reconocimiento de grafos; las claves nunca llegan al navegador."""
import base64
import json
import os
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI
from PIL import Image, ImageOps, UnidentifiedImageError

app = FastAPI(title="GraphSolver Vision API")
origins = [v.strip().rstrip('/') for v in os.getenv('ALLOWED_ORIGINS', '').split(',') if v.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['POST', 'GET'], allow_headers=['Content-Type'])

PROMPT = """Analyze this photograph or screenshot of a mathematical graph (graph theory).
Return a JSON object with exactly these fields: nodes (array), edges (array), directed (boolean).
Each node: {"id":"unique-string","label":"visible label","x":0.0,"y":0.0}.
x and y are relative center positions from 0 to 1 (left-to-right, top-to-bottom).
Each edge: {"source":"node-id","target":"node-id","weight":number-or-null}.
Only return edges whose connections are visually supported. A line crossing another line without a node is NOT a junction.
Read numeric edge weights only when clearly visible. If no weight is printed or it is ambiguous, set weight to null; NEVER invent weights or default to 1.
If a node label is unclear, use a temporary unique id and label like N1.
Support circles with/without fill, handwriting, curves, arrowheads, and straight edges.
Do not invent nodes or edges. If ambiguous, omit and let the user add them in the editor.
Return JSON only; no markdown or prose. Coordinates should match the image itself, not a surrounding browser UI."""

@app.get('/health')
async def health():
    return {'ok': True}

@app.post('/analyze')
async def analyze(image: UploadFile = File(...)):
    if not os.getenv('OPENAI_API_KEY'):
        raise HTTPException(503, 'Configura OPENAI_API_KEY en el servidor.')
    if image.content_type not in ('image/jpeg', 'image/png', 'image/webp'):
        raise HTTPException(415, 'Solo se admiten imágenes JPEG, PNG o WebP.')
    raw = await image.read(6_000_001)
    if len(raw) > 6_000_000:
        raise HTTPException(413, 'La imagen supera 6 MB.')
    try:
        with Image.open(BytesIO(raw)) as original:
            original.verify()
        with Image.open(BytesIO(raw)) as original:
            im = ImageOps.exif_transpose(original).convert('RGB')
            im.thumbnail((1600, 1600))
            out = BytesIO()
            im.save(out, 'JPEG', quality=88)
            encoded = base64.b64encode(out.getvalue()).decode('ascii')
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, 'No se pudo leer la imagen.')
    try:
        client = AsyncOpenAI(timeout=75)
        response = await client.chat.completions.create(
            model=os.getenv('OPENAI_VISION_MODEL', 'gpt-4.1-mini'),
            response_format={'type': 'json_object'},
            messages=[
                {'role': 'system', 'content': PROMPT},
                {'role': 'user', 'content': [
                    {'type': 'text', 'text': 'Extract the graph shown in this image.'},
                    {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + encoded, 'detail': 'high'}}
                ]},
            ],
            max_tokens=4000,
        )
        data = json.loads(response.choices[0].message.content or '{}')
    except Exception:
        raise HTTPException(502, 'No se pudo completar el análisis de IA. Revisa el modelo, saldo y registros del servidor.')
    if not isinstance(data, dict) or not isinstance(data.get('nodes'), list) or not isinstance(data.get('edges'), list):
        raise HTTPException(502, 'La IA devolvió una estructura incompleta.')
    if len(data['nodes']) > 100 or len(data['edges']) > 500:
        raise HTTPException(422, 'Demasiados elementos detectados.')
    return data
