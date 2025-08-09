class FamilyTreeGL {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container ${containerId} not found`);

    this.data = data;
    this.people = new Map(data.people.map(p => [p.id, p]));
    this.onPersonSelected = () => {};
    this.onMarriageSelected = () => {};
    this.generationCache = {};

    const cached = localStorage.getItem('ft_positions');
    this.cachedPositions = cached ? JSON.parse(cached) : null;

    this.cy = cytoscape({
      container: this.container,
      elements: this.buildElements(),
      style: [
        {
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'background-color': '#4a90e2',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 120,
            'height': 40,
            'font-size': 10,
            'border-width': 1,
            'border-color': '#888'
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 4,
            'border-color': '#d32f2f'
          }
        },
        {
          selector: 'node.relative',
          style: {
            'border-width': 3,
            'border-color': '#f9a825'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#bbb',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle'
          }
        },
        {
          selector: 'edge.spouse',
          style: {
            'line-style': 'dashed',
            'target-arrow-shape': 'none'
          }
        }
      ],
      layout: this.cachedPositions ? { name: 'preset' } : { name: 'elk', animate: false, fit: true, worker: true },
      wheelSensitivity: 0.15
    });

    if (this.cachedPositions) {
      this.cy.nodes().positions(n => this.cachedPositions[n.id()]);
      this.cy.fit();
    } else {
      this.cy.once('layoutstop', () => this.cachePositions());
    }

    this.cy.on('tap', 'node', evt => {
      const id = evt.target.id();
      this.onPersonSelected(this.getPerson(id));
    });

    this.cy.on('render viewport', () => this.virtualize());
    this.virtualize();

    if (this.cy.minimap) {
      this.cy.minimap({ container: '#tree-minimap' });
    }
  }

  buildElements() {
    const elements = [];
    const spouseEdges = new Set();
    for (const p of this.data.people) {
      const label = `${p.name}\n${p.birthYear || ''}-${p.deathYear || ''}`;
      elements.push({ data: { id: p.id, label, generation: this.computeGeneration(p.id) } });
      if (p.fatherId) {
        elements.push({ data: { id: `e-${p.fatherId}-${p.id}`, source: p.fatherId, target: p.id } });
      }
      if (p.motherId) {
        elements.push({ data: { id: `e-${p.motherId}-${p.id}`, source: p.motherId, target: p.id } });
      }
      if (p.spouseIds) {
        for (const sid of p.spouseIds) {
          const edgeId = `m-${p.id}-${sid}`;
          if (!spouseEdges.has(edgeId) && !spouseEdges.has(`m-${sid}-${p.id}`)) {
            elements.push({ data: { id: edgeId, source: p.id, target: sid }, classes: 'spouse' });
            spouseEdges.add(edgeId);
          }
        }
      }
    }
    return elements;
  }

  computeGeneration(id) {
    if (this.generationCache[id] != null) return this.generationCache[id];
    const p = this.people.get(id);
    if (!p) return 0;
    const fatherGen = p.fatherId ? this.computeGeneration(p.fatherId) + 1 : 0;
    const motherGen = p.motherId ? this.computeGeneration(p.motherId) + 1 : 0;
    const gen = Math.max(fatherGen, motherGen);
    this.generationCache[id] = gen;
    return gen;
  }

  cachePositions() {
    const positions = {};
    this.cy.nodes().forEach(n => { positions[n.id()] = n.position(); });
    localStorage.setItem('ft_positions', JSON.stringify(positions));
  }

  virtualize() {
    const extent = this.cy.extent();
    const margin = 100;
    const x1 = extent.x1 - margin;
    const x2 = extent.x2 + margin;
    const y1 = extent.y1 - margin;
    const y2 = extent.y2 + margin;
    this.cy.nodes().forEach(n => {
      const p = n.position();
      const visible = p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
      n.style('display', visible ? 'element' : 'none');
    });
  }

  getPerson(id) {
    return this.people.get(id) || null;
  }

  getAllPeople() {
    return Array.from(this.people.values());
  }

  getPersonRelatives(id) {
    const person = this.getPerson(id);
    if (!person) return { father: null, mother: null, spouses: [], children: [], siblings: [] };
    const relatives = {
      father: person.fatherId ? this.getPerson(person.fatherId) : null,
      mother: person.motherId ? this.getPerson(person.motherId) : null,
      spouses: [],
      children: [],
      siblings: []
    };
    for (const p of this.people.values()) {
      if (p.id === id) continue;
      if (p.fatherId === id || p.motherId === id) relatives.children.push(p);
      if ((person.fatherId && p.fatherId === person.fatherId) || (person.motherId && p.motherId === person.motherId)) {
        relatives.siblings.push(p);
      }
    }
    if (person.spouseIds) {
      for (const sid of person.spouseIds) {
        const spouse = this.getPerson(sid);
        if (spouse) relatives.spouses.push(spouse);
      }
    }
    return relatives;
  }

  focusOnPerson(id) {
    const node = this.cy.getElementById(id);
    if (!node) return;
    this.cy.elements().removeClass('highlighted relative');
    node.addClass('highlighted');
    const relatives = this.getPersonRelatives(id);
    const ids = [];
    if (relatives.father) ids.push(relatives.father.id);
    if (relatives.mother) ids.push(relatives.mother.id);
    ids.push(...relatives.spouses.map(s => s.id));
    ids.push(...relatives.children.map(c => c.id));
    ids.forEach(rid => this.cy.getElementById(rid).addClass('relative'));
    this.cy.fit(node, 50);
    window.history.replaceState(null, '', `#${id}`);
  }

  zoomIn() {
    this.cy.zoom({ level: this.cy.zoom() * 1.2, renderedPosition: { x: this.container.clientWidth / 2, y: this.container.clientHeight / 2 } });
  }

  zoomOut() {
    this.cy.zoom({ level: this.cy.zoom() * 0.8, renderedPosition: { x: this.container.clientWidth / 2, y: this.container.clientHeight / 2 } });
  }

  resetView() {
    this.cy.fit();
  }

  collapseByGeneration(level) {
    this.cy.nodes().forEach(n => {
      const gen = n.data('generation') || 0;
      n.style('display', gen <= level ? 'element' : 'none');
    });
  }
}

window.FamilyTreeGL = FamilyTreeGL;
