# GraphSolver — versión GitHub Pages

GraphSolver funciona directamente en el navegador con HTML, CSS y JavaScript. No necesita Python, Flask, XAMPP, servidor propio ni base de datos.

## Publicación
1. Crea un repositorio **público** en GitHub, por ejemplo `GraphSolver`.
2. Sube **el contenido de esta carpeta** (index.html, static/, README.md y .nojekyll) a la raíz del repositorio. No subas el ZIP como único archivo.
3. Abre **Settings → Pages → Build and deployment**.
4. Selecciona **Deploy from a branch**, rama **main**, carpeta **/(root)** y guarda.
5. Visita `https://TU_USUARIO.github.io/GraphSolver/` (la publicación puede tardar unos minutos).

## Funciones
- Editor interactivo de grafos con Cytoscape.js.
- Validación local de nodos y aristas.
- Árbol de expansión mínima y máxima con Kruskal y Prim.
- Caminos más cortos con Dijkstra, Bellman-Ford y Floyd-Warshall.
- BFS, DFS, detección de ciclos y ordenamiento topológico.
- Matrices de adyacencia e incidencia; edición, construcción y exportación CSV.
- Visualización de pasos, selección y reproducción.

## Dependencias
La interfaz carga **Cytoscape.js** desde un CDN público. Para verla es necesaria conexión a Internet, aunque los algoritmos funcionan en el navegador sin enviar datos a un backend.

## Estructura
- `index.html`: página de inicio.
- `static/css/style.css`: estilos.
- `static/js/graph.js`: editor y visualizadores.
- `static/js/matrices.js`: interfaz de matrices.
- `static/js/algorithms.js`: algoritmos en JavaScript (sin Flask).
- `static/js/algorithm_info.js`: material original auxiliar.

## Nota
Los mensajes de error se muestran en la interfaz. Esta es una adaptación del proyecto Flask suministrado, no un despliegue del backend original.

## Importar grafo desde imagen

Pulsa «Importar grafo desde imagen», toma una foto o selecciona un archivo. La opción «Detectar nodos» realiza una búsqueda **experimental** de círculos oscuros y puede producir falsos positivos. Revisa el resultado: con «+ Nodo» marca los nodos que falten, con «Conectar» selecciona dos nodos y cambia el peso (inicialmente 1) en la lista. Finalmente pulsa «Importar al editor y resolver» y ejecuta el algoritmo que necesites.

**Limitación:** esta versión no reconoce automáticamente todas las aristas ni lee los pesos por OCR; deben verificarse e introducirse manualmente. No envía la fotografía a un servidor. Compatible con GitHub Pages.
