/**
 * FamilyTree2D
 * High-quality, production-grade 2D family tree renderer using D3.js (SVG)
 * - Smooth pan/zoom
 * - Animated transitions
 * - Material 3-inspired node styling
 */

class FamilyTree2D {
  constructor(containerId, data) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container ${containerId} not found`);

    // Data
    this.data = data;
    this.people = new Map(data.people.map(p => [p.id, p]));

    // Callbacks (wired by main.js)
    this.onPersonSelected = () => {};
    this.onMarriageSelected = () => {};

    // Layout config
    this.nodeWidth = 160;
    this.nodeHeight = 48;
    this.verticalGap = 80;
    this.horizontalGap = 32;

    // Setup SVG
    this.setupSVG();
    this.render();
  }

  setupSVG() {
    // Ensure container is empty and styled
    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    const { clientWidth: width, clientHeight: height } = this.container;
    this.width = Math.max(600, width);
    this.height = Math.max(400, height);

    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, this.width, this.height].join(' '))
      .style('background', 'var(--md-sys-color-background)');

    // Zoom/pan container
    this.zoomLayer = this.svg.append('g');

    this.zoomBehavior = d3
      .zoom()
      .scaleExtent([0.25, 3])
      .on('zoom', (event) => this.zoomLayer.attr('transform', event.transform));

    this.svg.call(this.zoomBehavior);
  }

  // Build D3 hierarchy from parent relationships
  buildHierarchy() {
    const personNodes = new Map();
    for (const p of this.people.values()) {
      personNodes.set(p.id, { id: p.id, person: p, children: [] });
    }

    // Link children to (one) parent to keep a clean tree. Prefer father, fallback to mother.
    for (const p of this.people.values()) {
      const child = personNodes.get(p.id);
      const parentId = p.fatherId || p.motherId;
      if (parentId && personNodes.has(parentId)) {
        personNodes.get(parentId).children.push(child);
      }
    }

    // Roots are those who are not a child of anyone
    const isChild = new Set();
    for (const node of personNodes.values()) {
      for (const c of node.children) isChild.add(c.id);
    }
    const roots = Array.from(personNodes.values()).filter(n => !isChild.has(n.id));

    // Virtual root if multiple roots
    if (roots.length === 1) return d3.hierarchy(roots[0]);
    return d3.hierarchy({ id: 'virtual-root', children: roots });
  }

  render() {
    const root = this.buildHierarchy();

    const treeLayout = d3
      .tree()
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6))
      .nodeSize([this.nodeWidth + this.horizontalGap, this.nodeHeight + this.verticalGap + 20]);

    const layout = treeLayout(root);

    // Centering
    const nodes = layout.descendants();
    const links = layout.links();
    const xExtent = d3.extent(nodes, d => d.x);
    const yExtent = d3.extent(nodes, d => d.y);
    const offsetX = -((xExtent[0] + xExtent[1]) / 2) + this.width / 2;
    const offsetY = -yExtent[0] + 40; // top padding

    // Links (smooth vertical cubic Bezier)
    const linkPath = (d) => {
      const x1 = d.source.x + offsetX;
      const y1 = d.source.y + offsetY;
      const x2 = d.target.x + offsetX;
      const y2 = d.target.y + offsetY;
      const my = (y1 + y2) / 2;
      return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
    };

    this.zoomLayer
      .selectAll('.ft-link')
      .data(links, d => d.source.data.id + '-' + d.target.data.id)
      .join(
        enter => enter
          .append('path')
          .attr('class', 'ft-link')
          .attr('d', linkPath)
          .attr('fill', 'none')
          .attr('stroke', 'var(--md-sys-color-outline)')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0)
          .call(path => path.transition().duration(500).attr('opacity', 1)),
        update => update.transition().duration(300).attr('d', linkPath)
      );

    // Nodes
    const nodeSel = this.zoomLayer
      .selectAll('.ft-node')
      .data(
        nodes.filter(d => d && d.data && !d.data.isVirtual && d.data.person),
        d => (d.data && (d.data.id || (d.data.person && d.data.person.id)))
      );

    const nodeEnter = nodeSel
      .enter()
      .append('g')
      .attr('class', 'ft-node')
      .attr('transform', d => `translate(${d.x + offsetX}, ${d.y + offsetY})`)
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => this.onPersonSelected(d.data.person));

    // Rounded rect background (Material 3 card style)
    nodeEnter
      .append('rect')
      .attr('rx', 14)
      .attr('ry', 14)
      .attr('x', -this.nodeWidth / 2)
      .attr('y', -this.nodeHeight / 2)
      .attr('width', this.nodeWidth)
      .attr('height', this.nodeHeight)
      .attr('fill', d => this.getNodeFill(d.data && d.data.person ? d.data.person : {}))
      .attr('stroke', 'var(--md-sys-color-outline-variant)')
      .attr('stroke-width', 1);

    // Name text
    nodeEnter
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'var(--md-sys-color-on-surface)')
      .attr('font-family', '"Noto Naskh Arabic", "Segoe UI", Roboto, Arial, sans-serif')
      .attr('font-size', 16)
      .attr('font-weight', 600)
      .attr('letter-spacing', 0.5)
      .text(d => this.truncate(d.data && d.data.person ? d.data.person.name : '', 20));

    nodeEnter.transition().duration(500).attr('opacity', 1);

    nodeSel
      .merge(nodeEnter)
      .transition()
      .duration(300)
      .attr('transform', d => `translate(${d.x + offsetX}, ${d.y + offsetY})`);
  }

  getNodeFill(person) {
    // Material 3 tones - adapt to theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || 
                   document.documentElement.classList.contains('dark') ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (person && person.gender === 'M') {
      return isDark ? '#1e3a5f' : '#E3F2FD'; // dark blue for dark mode, light blue for light mode
    }
    if (person && person.gender === 'F') {
      return isDark ? '#4a1e3a' : '#FCE4EC'; // dark pink for dark mode, light pink for light mode
    }
    return isDark ? '#2d2d2d' : '#F5F5F5'; // dark grey for dark mode, light grey for light mode
  }

  truncate(text, max) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }

  // API parity with 3D version used by UI
  onWindowResize() {
    // Recompute viewBox based on new container size
    const { clientWidth: w, clientHeight: h } = this.container;
    this.width = Math.max(600, w);
    this.height = Math.max(400, h);
    this.svg.attr('viewBox', [0, 0, this.width, this.height].join(' '));
    this.render();
  }

  getAllPeople() {
    return Array.from(this.people.values());
  }

  // Get person by ID
  getPerson(id) {
    return this.people.get(id) || null;
  }

  // Focus on a specific person (center and highlight)
  focusOnPerson(personId) {
    const person = this.getPerson(personId);
    if (!person) return;

    // Find the node in the current layout
    const nodes = this.zoomLayer.selectAll('.ft-node').data();
    const targetNode = nodes.find(d => d.data && d.data.person && d.data.person.id === personId);
    
    if (targetNode) {
      // Calculate center position
      const centerX = targetNode.x;
      const centerY = targetNode.y;
      
      // Animate to center the person
      const transform = d3.zoomIdentity
        .translate(this.width / 2 - centerX, this.height / 2 - centerY)
        .scale(1.5);
      
      this.svg
        .transition()
        .duration(1000)
        .call(this.zoomBehavior.transform, transform);
      
      // Highlight the node
      this.zoomLayer.selectAll('.ft-node')
        .classed('highlighted', false);
      
      this.zoomLayer.selectAll('.ft-node')
        .filter(d => d.data && d.data.person && d.data.person.id === personId)
        .classed('highlighted', true);
    }
  }

  // Reset view to show entire tree
  resetView() {
    // Reset zoom and pan
    this.svg
      .transition()
      .duration(500)
      .call(this.zoomBehavior.transform, d3.zoomIdentity);

    // Remove highlights
    this.zoomLayer.selectAll('.ft-node')
      .classed('highlighted', false);
  }

  // Zoom controls for UIController
  zoomIn() {
    this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 1.2);
  }

  zoomOut() {
    this.svg.transition().duration(300).call(this.zoomBehavior.scaleBy, 0.8);
  }

  // Get person relatives (for details panel)
  getPersonRelatives(personId) {
    const person = this.getPerson(personId);
    if (!person) return { father: null, mother: null, spouses: [], children: [], siblings: [] };

    const relatives = {
      father: person.fatherId ? this.getPerson(person.fatherId) : null,
      mother: person.motherId ? this.getPerson(person.motherId) : null,
      spouses: [],
      children: [],
      siblings: []
    };

    // Find children
    for (const p of this.people.values()) {
      if ((p.fatherId === personId || p.motherId === personId) && p.id !== personId) {
        relatives.children.push(p);
      }
    }

    // Find siblings (same parents)
    for (const p of this.people.values()) {
      if (p.id !== personId && 
          ((person.fatherId && p.fatherId === person.fatherId) || 
           (person.motherId && p.motherId === person.motherId))) {
        relatives.siblings.push(p);
      }
    }

    // Find spouses (simplified - based on spouseIds)
    if (person.spouseIds && person.spouseIds.length > 0) {
      for (const spouseId of person.spouseIds) {
        const spouse = this.getPerson(spouseId);
        if (spouse) relatives.spouses.push(spouse);
      }
    }

    return relatives;
  }

  // Handle theme changes
  updateTheme() {
    // Re-render to update colors
    this.render();
  }
}

// Export
window.FamilyTree2D = FamilyTree2D;


