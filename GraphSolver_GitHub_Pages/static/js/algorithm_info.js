(() => {
  'use strict';
  const definitions = {
    kruskal: {
      name: 'Kruskal',
      description: max => `Ordena las aristas de ${max ? 'mayor a menor' : 'menor a mayor'} peso y las incorpora siempre que no formen ciclos.`,
      purpose: max => `Construir un árbol de expansión ${max ? 'máxima' : 'mínima'} que conecte todos los vértices.`,
      requirements: 'Grafo no dirigido y conexo. Los pesos pueden ser positivos, cero o negativos.'
    },
    prim: {
      name: 'Prim',
      description: max => `Comienza en un vértice y añade repetidamente la arista de ${max ? 'mayor' : 'menor'} peso que conecta el árbol actual con un vértice todavía no incluido.`,
      purpose: max => `Construir un árbol de expansión ${max ? 'máxima' : 'mínima'}.`,
      requirements: 'Grafo no dirigido y conexo. Los pesos pueden ser positivos, cero o negativos.'
    },
    dijkstra: {name:'Dijkstra',description:()=> 'Selecciona progresivamente el vértice pendiente con menor distancia conocida desde el origen y actualiza las distancias de sus vecinos.',purpose:()=> 'Encontrar el camino más corto desde el origen hasta el destino.',requirements:'No admite aristas con pesos negativos.'},
    bellman_ford: {name:'Bellman-Ford',description:()=> 'Relaja las aristas repetidamente para mejorar las distancias conocidas desde el origen.',purpose:()=> 'Encontrar caminos mínimos y detectar ciclos negativos alcanzables desde el origen.',requirements:'Admite pesos negativos; un ciclo negativo alcanzable puede impedir definir una distancia mínima.'},
    floyd_warshall: {name:'Floyd-Warshall',description:()=> 'Compara las distancias entre cada par de vértices utilizando sucesivamente cada vértice como intermediario.',purpose:()=> 'Calcular caminos mínimos entre todos los pares de vértices.',requirements:'Admite pesos negativos, pero los ciclos negativos pueden hacer indefinidas ciertas distancias.'},
    bfs: {name:'BFS (anchura)',description:()=> 'Visita primero los vértices cercanos al origen en cantidad de aristas, avanzando por niveles mediante una cola.',purpose:()=> 'Recorrer el grafo por anchura.',requirements:'No utiliza los pesos de las aristas.'},
    dfs: {name:'DFS (profundidad)',description:()=> 'Explora cada rama hasta donde sea posible antes de retroceder y continuar por otra.',purpose:()=> 'Recorrer el grafo en profundidad.',requirements:'No utiliza los pesos de las aristas.'},
    cycles: {name:'Detección de ciclos',description:()=> 'Examina las conexiones para determinar si existe un recorrido cerrado que constituya un ciclo.',purpose:()=> 'Identificar la existencia de ciclos.',requirements:'El procedimiento depende de si el grafo es dirigido o no dirigido.'},
    topological: {name:'Ordenamiento topológico',description:()=> 'Ordena los vértices de forma que cada vértice aparezca antes que todos aquellos a los que apunta.',purpose:()=> 'Obtener un orden válido de dependencias.',requirements:'Solo se aplica a grafos dirigidos acíclicos (DAG).'}
  };
  const byId = id => document.getElementById(id);
  const panel = byId('algorithm-info-panel');
  function hide() { panel.hidden = true; }
  function show(key, objective) {
    const info = definitions[key];
    if (!info) { hide(); return; }
    const max = (key === 'kruskal' || key === 'prim') && objective === 'max';
    byId('algorithm-info-name').textContent = info.name + ((key === 'kruskal' || key === 'prim') ? ` — árbol ${max ? 'máximo' : 'mínimo'}` : '');
    byId('algorithm-info-description').textContent = info.description(max);
    byId('algorithm-info-purpose').textContent = info.purpose(max);
    byId('algorithm-info-requirements').textContent = info.requirements;
    panel.hidden = false;
  }
  document.addEventListener('graphsolver:solved', event => {
    const { algorithm, objective } = event.detail || {};
    show(algorithm, objective);
  });
  document.addEventListener('graphsolver:invalidated', hide);
  hide();
})();
