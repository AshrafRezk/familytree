/**
 * Admin Panel Module
 * Handles authentication, data editing, and saving functionality
 */

class AdminPanel {
    constructor(familyTree, uiController) {
        this.familyTree = familyTree;
        this.uiController = uiController;
        this.isAuthenticated = false;
        this.currentUser = null;
        
        // DOM elements
        this.adminModal = document.getElementById('admin-modal');
        this.adminBtn = document.getElementById('admin-btn');
        this.closeAdminBtn = document.getElementById('close-admin');
        this.addPersonForm = document.getElementById('add-person-form');
        this.tabButtons = document.querySelectorAll('.admin-tab');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Form elements
        this.newPersonName = document.getElementById('new-person-name');
        this.newPersonAltNames = document.getElementById('new-person-alt-names');
        this.newPersonBirthYear = document.getElementById('new-person-birth-year');
        this.newPersonDeathYear = document.getElementById('new-person-death-year');
        this.genderMale = document.getElementById('gender-male');
        this.genderFemale = document.getElementById('gender-female');
        
        this.setupEventListeners();
        this.setupMaterialComponents();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Modal controls
        this.adminBtn.addEventListener('click', this.showAdminPanel.bind(this));
        this.closeAdminBtn.addEventListener('click', this.hideAdminPanel.bind(this));
        
        // Tab switching
        this.tabButtons.forEach(button => {
            button.addEventListener('click', this.switchTab.bind(this));
        });
        
        // Form submission
        this.addPersonForm.addEventListener('submit', this.handleAddPerson.bind(this));
        
        // Click outside to close
        this.adminModal.addEventListener('click', (e) => {
            if (e.target === this.adminModal) {
                this.hideAdminPanel();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    /**
     * Setup Material Design components
     */
    setupMaterialComponents() {
        try {
            // Initialize tabs
            this.tabButtons.forEach(button => {
                if (mdc.tab && mdc.tab.MDCTab) {
                    new mdc.tab.MDCTab(button);
                }
            });
            
            // Initialize form fields
            const textFields = document.querySelectorAll('.mdc-text-field');
            textFields.forEach(field => {
                if (mdc.textField && mdc.textField.MDCTextField) {
                    new mdc.textField.MDCTextField(field);
                }
            });
            
            // Initialize radio buttons
            const radioButtons = document.querySelectorAll('.mdc-radio');
            radioButtons.forEach(radio => {
                if (mdc.radio && mdc.radio.MDCRadio) {
                    new mdc.radio.MDCRadio(radio);
                }
            });
            
            // Initialize buttons
            const buttons = document.querySelectorAll('.mdc-button');
            buttons.forEach(button => {
                if (mdc.button && mdc.button.MDCButton) {
                    new mdc.button.MDCButton(button);
                }
            });
        } catch (error) {
            console.warn('Material Design Components not fully loaded:', error);
        }
    }

    /**
     * Show admin panel
     */
    showAdminPanel() {
        if (!this.isAuthenticated) {
            this.showLoginPrompt();
            return;
        }
        
        this.adminModal.classList.add('active');
        this.setupTabIndicators();
    }

    /**
     * Hide admin panel
     */
    hideAdminPanel() {
        this.adminModal.classList.remove('active');
        this.resetForm();
    }

    /**
     * Show login prompt
     */
    showLoginPrompt() {
        const password = prompt('Enter admin password:');
        if (password === 'admin123') { // In production, use proper authentication
            this.isAuthenticated = true;
            this.currentUser = { name: 'Admin', role: 'admin' };
            this.showAdminPanel();
            this.uiController.showNotification('Welcome, Admin!', 'success');
        } else if (password !== null) {
            this.uiController.showNotification('Invalid password', 'error');
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(event) {
        const targetTab = event.currentTarget.dataset.tab;
        
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.remove('mdc-tab--active');
            const indicator = button.querySelector('.mdc-tab-indicator');
            indicator.classList.remove('mdc-tab-indicator--active');
        });
        
        event.currentTarget.classList.add('mdc-tab--active');
        const activeIndicator = event.currentTarget.querySelector('.mdc-tab-indicator');
        activeIndicator.classList.add('mdc-tab-indicator--active');
        
        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.add('hidden');
        });
        
        const targetContent = document.getElementById(`${targetTab}-content`);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    }

    /**
     * Setup tab indicators
     */
    setupTabIndicators() {
        this.tabButtons.forEach(button => {
            const indicator = button.querySelector('.mdc-tab-indicator');
            if (indicator) {
                new mdc.tabIndicator.MDCTabIndicator(indicator);
            }
        });
    }

    /**
     * Handle add person form submission
     */
    handleAddPerson(event) {
        event.preventDefault();
        
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }
        
        const newPerson = this.createPersonFromFormData(formData);
        this.addPersonToTree(newPerson);
        
        this.resetForm();
        this.uiController.showNotification('Person added successfully', 'success');
    }

    /**
     * Get form data
     */
    getFormData() {
        return {
            name: this.newPersonName.value.trim(),
            altNames: this.newPersonAltNames.value.trim(),
            birthYear: this.newPersonBirthYear.value ? parseInt(this.newPersonBirthYear.value) : null,
            deathYear: this.newPersonDeathYear.value ? parseInt(this.newPersonDeathYear.value) : null,
            gender: this.genderMale.checked ? 'M' : this.genderFemale.checked ? 'F' : null
        };
    }

    /**
     * Validate form data
     */
    validateFormData(data) {
        if (!data.name) {
            this.uiController.showNotification('Name is required', 'error');
            return false;
        }
        
        if (data.birthYear && data.deathYear && data.birthYear > data.deathYear) {
            this.uiController.showNotification('Birth year cannot be after death year', 'error');
            return false;
        }
        
        if (data.birthYear && (data.birthYear < 1500 || data.birthYear > new Date().getFullYear())) {
            this.uiController.showNotification('Birth year must be between 1500 and current year', 'error');
            return false;
        }
        
        if (data.deathYear && (data.deathYear < 1500 || data.deathYear > new Date().getFullYear())) {
            this.uiController.showNotification('Death year must be between 1500 and current year', 'error');
            return false;
        }
        
        return true;
    }

    /**
     * Create person object from form data
     */
    createPersonFromFormData(data) {
        const personId = this.generatePersonId();
        
        return {
            id: personId,
            name: data.name,
            altNames: data.altNames ? data.altNames.split(',').map(name => name.trim()) : [],
            gender: data.gender,
            birthYear: data.birthYear,
            deathYear: data.deathYear,
            fatherId: null,
            motherId: null,
            spouseIds: [],
            sourceRefs: ['Admin Added']
        };
    }

    /**
     * Generate unique person ID
     */
    generatePersonId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        return `P-${timestamp}${random}`;
    }

    /**
     * Add person to tree
     */
    addPersonToTree(person) {
        // Get current data
        const currentData = this.familyTree.data;
        
        // Add new person
        currentData.people.push(person);
        
        // Update tree
        this.familyTree.updateData(currentData);
        
        // Save to storage
        this.saveData(currentData);
    }

    /**
     * Reset form
     */
    resetForm() {
        this.addPersonForm.reset();
        
        // Reset Material Design components
        const textFields = document.querySelectorAll('.mdc-text-field');
        textFields.forEach(field => {
            const mdcField = field.MDCTextField;
            if (mdcField) {
                mdcField.value = '';
            }
        });
        
        const radioButtons = document.querySelectorAll('.mdc-radio');
        radioButtons.forEach(radio => {
            const mdcRadio = radio.MDCRadio;
            if (mdcRadio) {
                mdcRadio.checked = false;
            }
        });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        // Only handle shortcuts when admin modal is open
        if (!this.adminModal.classList.contains('active')) {
            return;
        }
        
        switch (event.key) {
            case 'Escape':
                this.hideAdminPanel();
                break;
            case 's':
            case 'S':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.saveCurrentData();
                }
                break;
        }
    }

    /**
     * Save current data
     */
    saveCurrentData() {
        const currentData = this.familyTree.data;
        this.saveData(currentData);
        this.uiController.showNotification('Data saved successfully', 'success');
    }

    /**
     * Save data to storage
     */
    saveData(data) {
        try {
            // Save to localStorage (for demo purposes)
            localStorage.setItem('familyTreeData', JSON.stringify(data));
            
            // In production, this would save to a server
            // this.saveToServer(data);
            
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.uiController.showNotification('Error saving data', 'error');
            return false;
        }
    }

    /**
     * Load data from storage
     */
    loadData() {
        try {
            const savedData = localStorage.getItem('familyTreeData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.familyTree.updateData(data);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading data:', error);
            return false;
        }
    }

    /**
     * Export data as JSON
     */
    exportData() {
        const data = this.familyTree.data;
        const jsonString = JSON.stringify(data, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-tree-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.uiController.showNotification('Data exported successfully', 'success');
    }

    /**
     * Import data from JSON file
     */
    importData(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (this.validateImportedData(data)) {
                    this.familyTree.updateData(data);
                    this.saveData(data);
                    this.uiController.showNotification('Data imported successfully', 'success');
                } else {
                    this.uiController.showNotification('Invalid data format', 'error');
                }
            } catch (error) {
                console.error('Error importing data:', error);
                this.uiController.showNotification('Error importing data', 'error');
            }
        };
        
        reader.readAsText(file);
    }

    /**
     * Validate imported data
     */
    validateImportedData(data) {
        return data && 
               Array.isArray(data.people) && 
               typeof data.aliases === 'object' &&
               Array.isArray(data.marriages);
    }

    /**
     * Get person for editing
     */
    getPersonForEditing(personId) {
        const person = this.familyTree.getPerson(personId);
        if (!person) {
            this.uiController.showNotification('Person not found', 'error');
            return null;
        }
        
        return person;
    }

    /**
     * Update person data
     */
    updatePerson(personId, updatedData) {
        const currentData = this.familyTree.data;
        const personIndex = currentData.people.findIndex(p => p.id === personId);
        
        if (personIndex === -1) {
            this.uiController.showNotification('Person not found', 'error');
            return false;
        }
        
        // Update person data
        currentData.people[personIndex] = {
            ...currentData.people[personIndex],
            ...updatedData
        };
        
        // Update tree
        this.familyTree.updateData(currentData);
        
        // Save to storage
        this.saveData(currentData);
        
        this.uiController.showNotification('Person updated successfully', 'success');
        return true;
    }

    /**
     * Delete person
     */
    deletePerson(personId) {
        if (!confirm('Are you sure you want to delete this person? This action cannot be undone.')) {
            return false;
        }
        
        const currentData = this.familyTree.data;
        
        // Remove person from people array
        currentData.people = currentData.people.filter(p => p.id !== personId);
        
        // Remove person from marriages
        currentData.marriages = currentData.marriages.filter(m => 
            m.spouse1Id !== personId && m.spouse2Id !== personId
        );
        
        // Remove person from other people's relationships
        currentData.people.forEach(person => {
            if (person.fatherId === personId) person.fatherId = null;
            if (person.motherId === personId) person.motherId = null;
            if (person.spouseIds) {
                person.spouseIds = person.spouseIds.filter(id => id !== personId);
            }
        });
        
        // Update tree
        this.familyTree.updateData(currentData);
        
        // Save to storage
        this.saveData(currentData);
        
        this.uiController.showNotification('Person deleted successfully', 'success');
        return true;
    }

    /**
     * Get authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            currentUser: this.currentUser
        };
    }

    /**
     * Logout
     */
    logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.hideAdminPanel();
        this.uiController.showNotification('Logged out successfully', 'info');
    }
}

// Export for use in other modules
window.AdminPanel = AdminPanel;
