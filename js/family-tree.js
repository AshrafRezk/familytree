/**
 * Family Tree Visualization Module
 * Uses Three.js for 3D visualization with D3.js for layout calculations
 */

class FamilyTree {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.people = new Map(data.people.map(p => [p.id, p]));
        this.marriages = new Map(data.marriages.map(m => [m.id, m]));
        
        // Three.js setup
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Tree structure
        this.nodes = new Map();
        this.edges = new Map();
        this.marriageNodes = new Map();
        
        // Interaction state
        this.selectedNode = null;
        this.hoveredNode = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Layout
        this.layout = null;
        this.nodeSize = 30;
        this.marriageNodeSize = 15;
        this.nodeSpacing = 100;
        this.generationSpacing = 150;
        
        // Colors
        this.colors = {
            male: 0x2196F3,
            female: 0xE91E63,
            unknown: 0x9E9E9E,
            marriage: 0x4CAF50,
            edge: 0x757575,
            selected: 0xFF9800,
            hover: 0xFFC107
        };
        
        this.init();
    }

    /**
     * Initialize the family tree visualization
     */
    init() {
        this.setupThreeJS();
        this.calculateLayout();
        this.createNodes();
        this.createEdges();
        this.setupEventListeners();
        this.animate();
    }

    /**
     * Setup Three.js scene, camera, and renderer
     */
    setupThreeJS() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 0, 1000);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.container,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 100;
        this.controls.maxDistance = 5000;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);
    }

    /**
     * Calculate tree layout using D3.js hierarchy
     */
    calculateLayout() {
        // Create hierarchy from data
        const rootPeople = this.findRootPeople();
        const hierarchy = this.createHierarchy(rootPeople);
        
        console.log('Hierarchy created:', hierarchy);
        console.log('Root people:', rootPeople.length);
        
        // Calculate layout with better spacing
        const treeLayout = d3.tree()
            .nodeSize([this.nodeSpacing * 2, this.generationSpacing * 1.5])
            .separation((a, b) => {
                // Separate siblings more
                return a.parent === b.parent ? 1.5 : 2.0;
            });

        this.layout = treeLayout(hierarchy);
        
        console.log('Layout calculated with', this.layout.descendants().length, 'nodes');
        
        // Center the tree
        const descendants = this.layout.descendants();
        if (descendants.length > 0) {
            const xExtent = d3.extent(descendants, d => d.x);
            const yExtent = d3.extent(descendants, d => d.y);
            
            // Center the tree
            const centerX = (xExtent[0] + xExtent[1]) / 2;
            const centerY = (yExtent[0] + yExtent[1]) / 2;
            
            descendants.forEach(d => {
                d.x -= centerX;
                d.y -= centerY;
            });
        }
    }

    /**
     * Find root people (those without parents)
     */
    findRootPeople() {
        const rootPeople = [];
        
        for (const person of this.people.values()) {
            if (!person.fatherId && !person.motherId) {
                rootPeople.push(person);
            }
        }
        
        return rootPeople;
    }

    /**
     * Create D3 hierarchy from people data
     */
    createHierarchy(rootPeople) {
        const personMap = new Map();
        
        // Create nodes for all people
        for (const person of this.people.values()) {
            personMap.set(person.id, {
                id: person.id,
                person: person,
                children: []
            });
        }
        
        // Build parent-child relationships (simplified approach)
        for (const person of this.people.values()) {
            const personNode = personMap.get(person.id);
            if (!personNode) continue;
            
            // Handle father relationship
            if (person.fatherId) {
                const father = personMap.get(person.fatherId);
                if (father) {
                    father.children.push(personNode);
                }
            }
            
            // Handle mother relationship (if no father, or as additional parent)
            if (person.motherId && (!person.fatherId || person.fatherId !== person.motherId)) {
                const mother = personMap.get(person.motherId);
                if (mother) {
                    mother.children.push(personNode);
                }
            }
        }
        
        // Create root nodes
        const rootNodes = rootPeople.map(person => personMap.get(person.id)).filter(Boolean);
        
        // If no clear roots, create a virtual root
        if (rootNodes.length === 0) {
            const virtualRoot = {
                id: 'virtual-root',
                person: null,
                children: Array.from(personMap.values()).filter(node => 
                    !this.hasParent(node.id, personMap)
                ),
                isVirtual: true
            };
            return d3.hierarchy(virtualRoot);
        } else if (rootNodes.length === 1) {
            return d3.hierarchy(rootNodes[0]);
        } else {
            // Multiple roots - create virtual root
            const virtualRoot = {
                id: 'virtual-root',
                person: null,
                children: rootNodes,
                isVirtual: true
            };
            return d3.hierarchy(virtualRoot);
        }
    }

    /**
     * Check if a node has a parent in the hierarchy
     */
    hasParent(nodeId, personMap) {
        for (const node of personMap.values()) {
            if (node.children.some(child => child.id === nodeId)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Generate marriage ID
     */
    generateMarriageId(spouse1Id, spouse2Id) {
        const sortedIds = [spouse1Id, spouse2Id].sort();
        return `M-${sortedIds[0]}_${sortedIds[1]}`;
    }

    /**
     * Create Three.js nodes for all people
     */
    createNodes() {
        this.layout.descendants().forEach(node => {
            if (node.data.isVirtual) return;
            
            if (node.data.isMarriage) {
                this.createMarriageNode(node);
            } else {
                this.createPersonNode(node);
            }
        });
    }

    /**
     * Create a person node with modern design (capsule built from primitives)
     */
    createPersonNode(node) {
        const person = node.data.person;
        
        // Create modern pill-shaped node using cylinder + two spheres (compatible with r128)
        const group = new THREE.Group();
        
        // Dimensions
        const radius = this.nodeSize * 0.6;
        const bodyHeight = this.nodeSize * 0.8; // distance between the hemispheres
        
        // Choose color based on gender
        let color = 0x9E9E9E; // Default gray
        if (person.gender === 'M') {
            color = 0x2196F3; // Material Blue
        } else if (person.gender === 'F') {
            color = 0xE91E63; // Material Pink
        }
        
        const bodyMaterial = new THREE.MeshLambertMaterial({
            color: color,
            transparent: true,
            opacity: 0.95
        });
        
        // Cylinder body
        const cylGeo = new THREE.CylinderGeometry(radius, radius, bodyHeight, 20, 1, true);
        const cylMesh = new THREE.Mesh(cylGeo, bodyMaterial);
        
        // Hemispheres
        const sphereGeo = new THREE.SphereGeometry(radius, 20, 16);
        const topHemisphere = new THREE.Mesh(sphereGeo, bodyMaterial);
        topHemisphere.position.y = bodyHeight / 2;
        const bottomHemisphere = new THREE.Mesh(sphereGeo, bodyMaterial);
        bottomHemisphere.position.y = -bodyHeight / 2;
        
        // Subtle halo (visual polish)
        const haloGeo = new THREE.SphereGeometry(radius * 1.15, 20, 16);
        const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        
        group.add(haloMesh);
        group.add(cylMesh);
        group.add(topHemisphere);
        group.add(bottomHemisphere);
        
        // Position node
        group.position.set(node.x, -node.y, 0);
        group.userData = {
            type: 'person',
            person: person,
            node: node
        };
        
        // Add modern text label
        this.addModernTextLabel(group, person.name);
        
        this.nodes.set(person.id, group);
        this.scene.add(group);
    }

    /**
     * Create a marriage node
     */
    createMarriageNode(node) {
        const geometry = new THREE.BoxGeometry(this.marriageNodeSize, this.marriageNodeSize, this.marriageNodeSize);
        const material = new THREE.MeshLambertMaterial({ color: this.colors.marriage });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position node
        mesh.position.set(node.x, -node.y, 0);
        mesh.userData = {
            type: 'marriage',
            node: node,
            spouse1: node.data.spouse1,
            spouse2: node.data.spouse2
        };
        
        this.marriageNodes.set(node.data.id, mesh);
        this.scene.add(mesh);
    }

    /**
     * Add modern text label to a node
     */
    addModernTextLabel(group, text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        // Create modern background with rounded corners
        context.fillStyle = 'rgba(255, 255, 255, 0.95)';
        context.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        context.lineWidth = 2;
        
        // Rounded rectangle
        const radius = 20;
        const x = 10;
        const y = 10;
        const width = canvas.width - 20;
        const height = canvas.height - 20;
        
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
        
        context.fill();
        context.stroke();
        
        // Add text with better font
        context.fillStyle = '#1c1b1f';
        context.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Truncate text if too long
        const maxLength = 15;
        const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
        
        context.fillText(displayText, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        sprite.position.set(0, this.nodeSize + 20, 0);
        sprite.scale.set(50, 12.5, 1);
        
        // Attach label to the provided group (not an undefined mesh)
        group.add(sprite);
    }

    /**
     * Create edges between nodes
     */
    createEdges() {
        this.layout.links().forEach(link => {
            if (link.source.data.isVirtual || link.target.data.isVirtual) return;
            
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(link.source.x, -link.source.y, 0),
                new THREE.Vector3(link.target.x, -link.target.y, 0)
            ]);
            
            const material = new THREE.LineBasicMaterial({ 
                color: this.colors.edge,
                linewidth: 2
            });
            
            const line = new THREE.Line(geometry, material);
            this.edges.set(`${link.source.data.id}-${link.target.data.id}`, line);
            this.scene.add(line);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Mouse events
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Window resize
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Handle mouse click
     */
    onMouseClick(event) {
        this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.container.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (object.userData.type === 'person') {
                this.selectPerson(object.userData.person);
            } else if (object.userData.type === 'marriage') {
                this.selectMarriage(object.userData);
            }
        } else {
            this.deselectAll();
        }
    }

    /**
     * Handle mouse move
     */
    onMouseMove(event) {
        this.mouse.x = (event.clientX / this.container.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.container.clientHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (object.userData.type === 'person' || object.userData.type === 'marriage') {
                this.hoverNode(object);
            }
        } else {
            this.unhoverNode();
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }

    /**
     * Select a person
     */
    selectPerson(person) {
        this.deselectAll();
        
        const node = this.nodes.get(person.id);
        if (node) {
            node.material.color.setHex(this.colors.selected);
            this.selectedNode = node;
            
            // Trigger selection event
            this.onPersonSelected(person);
        }
    }

    /**
     * Select a marriage
     */
    selectMarriage(marriageData) {
        this.deselectAll();
        
        const node = this.marriageNodes.get(marriageData.node.data.id);
        if (node) {
            node.material.color.setHex(this.colors.selected);
            this.selectedNode = node;
            
            // Trigger selection event
            this.onMarriageSelected(marriageData);
        }
    }

    /**
     * Deselect all nodes
     */
    deselectAll() {
        if (this.selectedNode) {
            this.resetNodeColor(this.selectedNode);
            this.selectedNode = null;
        }
    }

    /**
     * Hover over a node
     */
    hoverNode(node) {
        if (this.hoveredNode !== node) {
            this.unhoverNode();
            
            if (node.userData.type === 'person') {
                node.material.color.setHex(this.colors.hover);
            } else if (node.userData.type === 'marriage') {
                node.material.color.setHex(this.colors.hover);
            }
            
            this.hoveredNode = node;
        }
    }

    /**
     * Unhover node
     */
    unhoverNode() {
        if (this.hoveredNode && this.hoveredNode !== this.selectedNode) {
            this.resetNodeColor(this.hoveredNode);
            this.hoveredNode = null;
        }
    }

    /**
     * Reset node color to default
     */
    resetNodeColor(node) {
        if (node.userData.type === 'person') {
            const person = node.userData.person;
            let color = this.colors.unknown;
            if (person.gender === 'M') {
                color = this.colors.male;
            } else if (person.gender === 'F') {
                color = this.colors.female;
            }
            node.material.color.setHex(color);
        } else if (node.userData.type === 'marriage') {
            node.material.color.setHex(this.colors.marriage);
        }
    }

    /**
     * Focus on a specific person
     */
    focusOnPerson(personId) {
        const node = this.nodes.get(personId);
        if (node) {
            // Animate camera to person
            const targetPosition = new THREE.Vector3(node.position.x, node.position.y, 500);
            
            new TWEEN.Tween(this.camera.position)
                .to(targetPosition, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
        }
    }

    /**
     * Reset view to show entire tree
     */
    resetView() {
        const box = new THREE.Box3().setFromObject(this.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        
        cameraZ *= 1.5; // Add some padding
        
        const targetPosition = new THREE.Vector3(center.x, center.y, cameraZ);
        
        new TWEEN.Tween(this.camera.position)
            .to(targetPosition, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
    }

    /**
     * Search for people by name
     */
    searchPeople(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const person of this.people.values()) {
            if (person.name.toLowerCase().includes(queryLower)) {
                results.push(person);
            } else if (person.altNames) {
                for (const altName of person.altNames) {
                    if (altName.toLowerCase().includes(queryLower)) {
                        results.push(person);
                        break;
                    }
                }
            }
        }
        
        return results;
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        TWEEN.update();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Event handlers (to be overridden)
     */
    onPersonSelected(person) {
        // Override in main application
        console.log('Person selected:', person);
    }

    onMarriageSelected(marriageData) {
        // Override in main application
        console.log('Marriage selected:', marriageData);
    }

    /**
     * Update tree with new data
     */
    updateData(newData) {
        this.data = newData;
        this.people = new Map(newData.people.map(p => [p.id, p]));
        this.marriages = new Map(newData.marriages.map(m => [m.id, m]));
        
        // Clear existing nodes and edges
        this.clearScene();
        
        // Recalculate and recreate
        this.calculateLayout();
        this.createNodes();
        this.createEdges();
    }

    /**
     * Clear the scene
     */
    clearScene() {
        // Remove all nodes
        for (const node of this.nodes.values()) {
            this.scene.remove(node);
        }
        this.nodes.clear();
        
        // Remove all marriage nodes
        for (const node of this.marriageNodes.values()) {
            this.scene.remove(node);
        }
        this.marriageNodes.clear();
        
        // Remove all edges
        for (const edge of this.edges.values()) {
            this.scene.remove(edge);
        }
        this.edges.clear();
    }

    /**
     * Get person by ID
     */
    getPerson(id) {
        return this.people.get(id);
    }

    /**
     * Get all people
     */
    getAllPeople() {
        return Array.from(this.people.values());
    }

    /**
     * Get person's relatives
     */
    getPersonRelatives(personId) {
        const person = this.people.get(personId);
        if (!person) return null;
        
        const relatives = {
            person: person,
            father: person.fatherId ? this.people.get(person.fatherId) : null,
            mother: person.motherId ? this.people.get(person.motherId) : null,
            spouses: [],
            children: [],
            siblings: []
        };
        
        // Get spouses
        if (person.spouseIds) {
            for (const spouseId of person.spouseIds) {
                const spouse = this.people.get(spouseId);
                if (spouse) {
                    relatives.spouses.push(spouse);
                }
            }
        }
        
        // Get children
        for (const otherPerson of this.people.values()) {
            if (otherPerson.fatherId === personId || otherPerson.motherId === personId) {
                relatives.children.push(otherPerson);
            }
        }
        
        // Get siblings
        if (person.fatherId || person.motherId) {
            for (const otherPerson of this.people.values()) {
                if (otherPerson.id !== personId) {
                    if ((person.fatherId && otherPerson.fatherId === person.fatherId) ||
                        (person.motherId && otherPerson.motherId === person.motherId)) {
                        relatives.siblings.push(otherPerson);
                    }
                }
            }
        }
        
        return relatives;
    }
}

// Export for use in other modules
window.FamilyTree = FamilyTree;
