/**
 * Main Application Module
 * Initializes and coordinates all application modules
 */

class FamilyTreeApp {
    constructor() {
        this.dataConverter = null;
        this.familyTree = null;
        this.uiController = null;
        this.adminPanel = null;
        this.isInitialized = false;
        
        // Application state
        this.currentData = null;
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoading();
            
            // Initialize data converter
            this.dataConverter = new DataConverter();
            
            // Load and convert data
            await this.loadInitialData();
            
            // Initialize family tree visualization
            this.initializeFamilyTree();
            
            // Initialize UI controller
            this.initializeUIController();
            
            // Initialize admin panel
            this.initializeAdminPanel();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Hide loading and show tree
            this.hideLoading();
            this.isInitialized = true;
            
            console.log('Family Tree Application initialized successfully');
            
        } catch (error) {
            console.error('Error initializing application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Load initial data from CSV or JSON
     */
    async loadInitialData() {
        try {
            // Always try to load from CSV file first (the main data source)
            const csvData = await this.loadCSVData();
            if (csvData) {
                this.currentData = this.dataConverter.convertCSVToJSON(csvData);
                console.log('Successfully loaded and converted CSV data to JSON format');
                console.log(`Loaded ${this.currentData.people.length} people from CSV`);
                return;
            }
            
            // If CSV loading fails, try saved data from localStorage
            const savedData = localStorage.getItem('familyTreeData');
            if (savedData) {
                this.currentData = JSON.parse(savedData);
                console.log('Loaded saved data from localStorage');
                return;
            }
            
            // If no CSV data, create sample data
            this.currentData = this.createSampleData();
            console.log('Created sample data');
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.currentData = this.createSampleData();
        }
    }

    /**
     * Load CSV data from file
     */
    async loadCSVData() {
        try {
            console.log('Attempting to load CSV file: Family_Tree_with_Birth_Links.csv');
            const response = await fetch('Family_Tree_with_Birth_Links.csv');
            
            if (response.ok) {
                const csvText = await response.text();
                console.log('CSV file loaded successfully, size:', csvText.length, 'characters');
                console.log('First 200 characters of CSV:', csvText.substring(0, 200));
                return csvText;
            } else {
                console.error('Failed to load CSV file. Status:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error loading CSV file:', error);
            console.log('Make sure you are running the application from a local server (not file://)');
            console.log('Use: python3 server.py or python3 -m http.server 8000');
        }
        return null;
    }

    /**
     * Create sample data for testing
     */
    createSampleData() {
        return {
            people: [
                {
                    id: "P-000001",
                    name: "Dawood Soliman",
                    altNames: ["Dawood"],
                    gender: "M",
                    birthYear: 1750,
                    deathYear: 1824,
                    fatherId: null,
                    motherId: null,
                    spouseIds: [],
                    sourceRefs: ["Sample Data"]
                },
                {
                    id: "P-000002",
                    name: "Soliman Dawood",
                    altNames: ["Soliman"],
                    gender: "M",
                    birthYear: 1820,
                    deathYear: 1895,
                    fatherId: "P-000001",
                    motherId: null,
                    spouseIds: ["P-000003", "P-000004"],
                    sourceRefs: ["Sample Data"]
                },
                {
                    id: "P-000003",
                    name: "First Wife",
                    altNames: [],
                    gender: "F",
                    birthYear: null,
                    deathYear: null,
                    fatherId: null,
                    motherId: null,
                    spouseIds: ["P-000002"],
                    sourceRefs: ["Sample Data"]
                },
                {
                    id: "P-000004",
                    name: "Makhdoumah",
                    altNames: [],
                    gender: "F",
                    birthYear: null,
                    deathYear: null,
                    fatherId: null,
                    motherId: null,
                    spouseIds: ["P-000002"],
                    sourceRefs: ["Sample Data"]
                }
            ],
            aliases: {},
            marriages: [
                {
                    id: "M-P-000002_P-000003",
                    spouse1Id: "P-000002",
                    spouse2Id: "P-000003",
                    children: []
                },
                {
                    id: "M-P-000002_P-000004",
                    spouse1Id: "P-000002",
                    spouse2Id: "P-000004",
                    children: []
                }
            ],
            metadata: {
                totalPeople: 4,
                totalAliases: 0,
                totalMarriages: 2,
                lastUpdated: new Date().toISOString()
            }
        };
    }

    /**
     * Initialize family tree visualization
     */
    initializeFamilyTree() {
        const div2d = document.getElementById('family-tree-2d');
        div2d.style.display = 'block';
        this.familyTree = new FamilyTree2D('family-tree-2d', this.currentData);

        // Override event handlers
        this.familyTree.onPersonSelected = (person) => {
            this.uiController.showPersonDetails(person);
        };

        this.familyTree.onMarriageSelected = (marriageData) => {
            this.showMarriageDetails(marriageData);
        };

        // Focus on the newly added branch (Mariam Mamdouh Amin) on initial load
        setTimeout(() => {
            this.familyTree.focusOnPerson('P-000895');
        }, 0);
    }

    /**
     * Initialize UI controller
     */
    initializeUIController() {
        this.uiController = new UIController(this.familyTree);
    }

    /**
     * Initialize admin panel
     */
    initializeAdminPanel() {
        this.adminPanel = new AdminPanel(this.familyTree, this.uiController);
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Handle window resize
        window.addEventListener('resize', this.handleWindowResize.bind(this));
        
        // Handle visibility change (for mobile)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Handle beforeunload (save data)
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        // Handle online/offline status
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Handle theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.handleThemeToggle.bind(this));
        }
        
        // Initialize theme from localStorage
        this.initializeTheme();
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        if (this.familyTree) {
            this.familyTree.onWindowResize();
        }
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // App went to background
            this.saveCurrentState();
        } else {
            // App came to foreground
            this.loadCurrentState();
        }
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload() {
        this.saveCurrentState();
    }

    /**
     * Handle online status
     */
    handleOnline() {
        this.uiController.showNotification('Connection restored', 'success');
    }

    /**
     * Handle offline status
     */
    handleOffline() {
        this.uiController.showNotification('Connection lost - working offline', 'warning');
    }

    /**
     * Initialize theme from localStorage or system preference
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (systemPrefersDark) {
            this.setTheme('dark');
        } else {
            this.setTheme('light');
        }
    }

    /**
     * Handle theme toggle
     */
    handleThemeToggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    /**
     * Set theme and update UI
     */
    setTheme(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (themeToggle) {
                themeToggle.textContent = 'light_mode';
                themeToggle.title = 'Switch to Light Mode';
            }
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (themeToggle) {
                themeToggle.textContent = 'dark_mode';
                themeToggle.title = 'Switch to Dark Mode';
            }
        }
        
        // Save theme preference
        localStorage.setItem('theme', theme);
        
        // Re-render family tree if it exists to update colors
        if (this.familyTree && this.familyTree.updateTheme) {
            this.familyTree.updateTheme();
        }
    }

    /**
     * Show marriage details
     */
    showMarriageDetails(marriageData) {
        const spouse1 = this.familyTree.getPerson(marriageData.spouse1.person.id);
        const spouse2 = this.familyTree.getPerson(marriageData.spouse2.person.id);
        
        if (spouse1 && spouse2) {
            const details = `
                <div class="person-info">
                    <h4>Marriage Details</h4>
                    <p><span class="label">Spouse 1:</span> <a href="#" class="person-link" data-person-id="${spouse1.id}">${spouse1.name}</a></p>
                    <p><span class="label">Spouse 2:</span> <a href="#" class="person-link" data-person-id="${spouse2.id}">${spouse2.name}</a></p>
                </div>
            `;
            
            document.getElementById('person-name').textContent = 'Marriage Details';
            document.getElementById('person-details-content').innerHTML = details;
            document.getElementById('person-details-panel').classList.add('active');
            
            // Add event listeners to person links
            setTimeout(() => {
                const personLinks = document.getElementById('person-details-content').querySelectorAll('.person-link');
                personLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const personId = link.dataset.personId;
                        const person = this.familyTree.getPerson(personId);
                        if (person) {
                            this.familyTree.focusOnPerson(personId);
                            this.uiController.showPersonDetails(person);
                        }
                    });
                });
            }, 0);
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.isLoading = true;
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.isLoading = false;
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();
        if (this.uiController) {
            this.uiController.showNotification(message, 'error');
        } else {
            console.error('Application Error:', message);
            // Fallback error display
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f44336; color: white; padding: 16px; border-radius: 4px; z-index: 10000; max-width: 300px;';
            errorDiv.textContent = message;
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        }
    }

    /**
     * Save current application state
     */
    saveCurrentState() {
        if (this.familyTree && this.currentData) {
            try {
                localStorage.setItem('familyTreeData', JSON.stringify(this.currentData));
                localStorage.setItem('familyTreeState', JSON.stringify({
                    cameraPosition: this.familyTree.camera.position,
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Error saving state:', error);
            }
        }
    }

    /**
     * Load current application state
     */
    loadCurrentState() {
        try {
            const savedState = localStorage.getItem('familyTreeState');
            if (savedState && this.familyTree) {
                const state = JSON.parse(savedState);
                // Restore camera position if recent
                if (Date.now() - state.timestamp < 300000) { // 5 minutes
                    this.familyTree.camera.position.copy(state.cameraPosition);
                }
            }
        } catch (error) {
            console.error('Error loading state:', error);
        }
    }

    /**
     * Get application statistics
     */
    getStats() {
        if (!this.currentData) return null;
        
        return {
            totalPeople: this.currentData.people.length,
            totalMarriages: this.currentData.marriages.length,
            totalAliases: Object.keys(this.currentData.aliases).length,
            lastUpdated: this.currentData.metadata?.lastUpdated || new Date().toISOString()
        };
    }

    /**
     * Export application data
     */
    exportData() {
        if (this.adminPanel) {
            this.adminPanel.exportData();
        }
    }

    /**
     * Import application data
     */
    importData(file) {
        if (this.adminPanel) {
            this.adminPanel.importData(file);
        }
    }

    /**
     * Reset application to initial state
     */
    resetApplication() {
        if (confirm('Are you sure you want to reset the application? This will clear all saved data.')) {
            localStorage.removeItem('familyTreeData');
            localStorage.removeItem('familyTreeState');
            location.reload();
        }
    }

    /**
     * Get application instance
     */
    static getInstance() {
        if (!FamilyTreeApp.instance) {
            FamilyTreeApp.instance = new FamilyTreeApp();
        }
        return FamilyTreeApp.instance;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add skip link for accessibility
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.appendChild(skipLink);
    
    // Add main content ID
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.id = 'main-content';
    }
    
    // Initialize the application
    const app = FamilyTreeApp.getInstance();
    
    // Make app globally available for debugging
    window.familyTreeApp = app;
    
    // Add keyboard shortcuts for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey) {
                switch (event.key) {
                    case 'R':
                        event.preventDefault();
                        app.resetApplication();
                        break;
                    case 'E':
                        event.preventDefault();
                        app.exportData();
                        break;
                    case 'S':
                        event.preventDefault();
                        console.log('App Stats:', app.getStats());
                        break;
                }
            }
        });
    }
});

// Service worker registration removed to prevent 404 errors
// PWA functionality can be added later if needed

// Export for use in other modules
window.FamilyTreeApp = FamilyTreeApp;
