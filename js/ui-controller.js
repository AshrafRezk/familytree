/**
 * UI Controller Module
 * Handles user interactions, search, and person details display
 */

class UIController {
    constructor(familyTree) {
        this.familyTree = familyTree;
        this.searchPanel = document.getElementById('search-panel');
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        this.personDetailsPanel = document.getElementById('person-details-panel');
        this.personDetailsContent = document.getElementById('person-details-content');
        this.personName = document.getElementById('person-name');
        
        // Navigation controls
        this.zoomInBtn = document.getElementById('zoom-in');
        this.zoomOutBtn = document.getElementById('zoom-out');
        this.resetViewBtn = document.getElementById('reset-view');
        this.fullscreenBtn = document.getElementById('fullscreen');
        
        // Header buttons
        this.searchBtn = document.getElementById('search-btn');
        this.adminBtn = document.getElementById('admin-btn');
        this.helpBtn = document.getElementById('help-btn');
        
        // Close buttons
        this.closeDetailsBtn = document.getElementById('close-details');
        this.closeHelpBtn = document.getElementById('close-help');
        
        // Loading indicator
        this.loadingIndicator = document.getElementById('loading-indicator');
        
        // Initialize fuzzy search (Arabic + English transliterations)
        this.fuzzySearch = new FuzzySearch();
        
        this.setupEventListeners();
        this.setupMaterialComponents();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search functionality
        this.searchBtn.addEventListener('click', this.toggleSearchPanel.bind(this));
        this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        
        // Person details
        this.closeDetailsBtn.addEventListener('click', this.hidePersonDetails.bind(this));
        
        // Navigation controls
        this.zoomInBtn.addEventListener('click', this.zoomIn.bind(this));
        this.zoomOutBtn.addEventListener('click', this.zoomOut.bind(this));
        this.resetViewBtn.addEventListener('click', this.resetView.bind(this));
        this.fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
        
        // Help modal
        this.helpBtn.addEventListener('click', this.showHelp.bind(this));
        this.closeHelpBtn.addEventListener('click', this.hideHelp.bind(this));
        
        // Click outside to close panels
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
    }

    /**
     * Setup Material Design components
     */
    setupMaterialComponents() {
        try {
            // Initialize Material Design components
            if (mdc.textField && mdc.textField.MDCTextField) {
                mdc.textField.MDCTextField.attachTo(this.searchInput.parentElement);
            }
            
            // Initialize icon buttons
            const iconButtons = document.querySelectorAll('.mdc-icon-button');
            iconButtons.forEach(button => {
                if (mdc.iconButton && mdc.iconButton.MDCIconButtonToggle) {
                    new mdc.iconButton.MDCIconButtonToggle(button);
                }
            });
        } catch (error) {
            console.warn('Material Design Components not fully loaded:', error);
        }
    }

    /**
     * Toggle search panel visibility
     */
    toggleSearchPanel() {
        this.searchPanel.classList.toggle('active');
        if (this.searchPanel.classList.contains('active')) {
            this.searchInput.focus();
        }
    }

    /**
     * Handle search input with fuzzy search
     */
    handleSearch(event) {
        const query = event.target.value.trim();

        if (query.length < 2) {
            this.clearSearchResults();
            return;
        }

        const people = this.familyTree.getAllPeople();
        const searchResults = this.fuzzySearch.search(query, people);

        const results = searchResults.map(result => ({
            ...result.person,
            matchScore: result.score,
            matchType: result.matchType
        }));

        this.displaySearchResults(results);
    }

    /**
     * Handle search keydown events
     */
    handleSearchKeydown(event) {
        if (event.key === 'Escape') {
            this.hideSearchPanel();
        } else if (event.key === 'Enter') {
            const selectedResult = this.searchResults.querySelector('.search-result-item.selected');
            if (selectedResult) {
                const personId = selectedResult.dataset.personId;
                this.selectSearchResult(personId);
            }
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            this.navigateSearchResults(event.key === 'ArrowDown' ? 1 : -1);
        }
    }

    /**
     * Display search results with cognitive search info
     */
    displaySearchResults(results) {
        this.clearSearchResults();
        
        if (results.length === 0) {
            this.searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
            return;
        }
        
        results.slice(0, 10).forEach((person, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.personId = person.id;
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'person-name';
            nameSpan.textContent = person.name;
            
            const detailsSpan = document.createElement('span');
            detailsSpan.className = 'person-details';
            const details = [];
            if (person.birthYear) details.push(`b. ${person.birthYear}`);
            if (person.deathYear) details.push(`d. ${person.deathYear}`);
            if (person.gender) details.push(person.gender === 'M' ? 'Male' : 'Female');
            detailsSpan.textContent = details.join(' • ');

            resultItem.appendChild(nameSpan);
            resultItem.appendChild(detailsSpan);

            const relatives = this.familyTree.getPersonRelatives(person.id);
            const info = [];
            if (relatives.father || relatives.mother) {
                const parents = [
                    relatives.father ? relatives.father.name : null,
                    relatives.mother ? relatives.mother.name : null
                ].filter(Boolean).join(' / ');
                if (parents) info.push(`Parents: ${parents}`);
            }
            if (relatives.spouses.length > 0) {
                info.push(`Spouses: ${relatives.spouses.map(s => s.name).join(', ')}`);
            }
            if (info.length > 0) {
                const infoSpan = document.createElement('span');
                infoSpan.className = 'person-relatives';
                infoSpan.textContent = info.join(' | ');
                resultItem.appendChild(infoSpan);
            }

            // Add match type and score if available
            if (person.matchType) {
                const matchSpan = document.createElement('span');
                matchSpan.className = 'match-info';
                matchSpan.textContent = `${person.matchType} (${Math.round(person.matchScore * 100)}%)`;
                resultItem.appendChild(matchSpan);
            }
            
            resultItem.addEventListener('click', () => this.selectSearchResult(person.id));
            resultItem.addEventListener('mouseenter', () => this.highlightSearchResult(index));
            
            this.searchResults.appendChild(resultItem);
        });
        
        // Select first result by default
        if (results.length > 0) {
            this.highlightSearchResult(0);
        }
    }

    /**
     * Clear search results
     */
    clearSearchResults() {
        this.searchResults.innerHTML = '';
    }

    /**
     * Navigate search results with arrow keys
     */
    navigateSearchResults(direction) {
        const results = this.searchResults.querySelectorAll('.search-result-item');
        const currentSelected = this.searchResults.querySelector('.search-result-item.selected');
        let currentIndex = -1;
        
        if (currentSelected) {
            currentIndex = Array.from(results).indexOf(currentSelected);
        }
        
        const newIndex = Math.max(0, Math.min(results.length - 1, currentIndex + direction));
        
        if (results[newIndex]) {
            this.highlightSearchResult(newIndex);
        }
    }

    /**
     * Highlight a search result
     */
    highlightSearchResult(index) {
        const results = this.searchResults.querySelectorAll('.search-result-item');
        results.forEach((result, i) => {
            result.classList.toggle('selected', i === index);
        });
    }

    /**
     * Select a search result
     */
    selectSearchResult(personId) {
        const person = this.familyTree.getPerson(personId);
        if (person) {
            this.familyTree.focusOnPerson(personId);
            this.showPersonDetails(person);
            this.hideSearchPanel();
        }
    }

    /**
     * Hide search panel
     */
    hideSearchPanel() {
        this.searchPanel.classList.remove('active');
        this.clearSearchResults();
        this.searchInput.value = '';
    }

    /**
     * Show person details
     */
    showPersonDetails(person) {
        this.personName.textContent = person.name;
        this.personDetailsContent.innerHTML = this.generatePersonDetailsHTML(person);
        this.personDetailsPanel.classList.add('active');
    }

    /**
     * Hide person details
     */
    hidePersonDetails() {
        this.personDetailsPanel.classList.remove('active');
    }

    /**
     * Generate HTML for person details
     */
    generatePersonDetailsHTML(person) {
        const relatives = this.familyTree.getPersonRelatives(person.id);
        
        let html = `
            <div class="person-info">
                <h4>Basic Information</h4>
                <p><span class="label">Full Name:</span> ${person.name}</p>
                ${person.gender ? `<p><span class="label">Gender:</span> ${person.gender === 'M' ? 'Male' : 'Female'}</p>` : ''}
                ${person.birthYear ? `<p><span class="label">Birth Year:</span> ${person.birthYear}</p>` : ''}
                ${person.deathYear ? `<p><span class="label">Death Year:</span> ${person.deathYear}</p>` : ''}
                ${person.altNames && person.altNames.length > 0 ? 
                    `<p><span class="label">Alternative Names:</span> ${person.altNames.join(', ')}</p>` : ''}
            </div>
        `;
        
        // Parents
        if (relatives.father || relatives.mother) {
            html += '<div class="person-info"><h4>Parents</h4>';
            if (relatives.father) {
                html += `<p><span class="label">Father:</span> <a href="#" class="person-link" data-person-id="${relatives.father.id}">${relatives.father.name}</a></p>`;
            }
            if (relatives.mother) {
                html += `<p><span class="label">Mother:</span> <a href="#" class="person-link" data-person-id="${relatives.mother.id}">${relatives.mother.name}</a></p>`;
            }
            html += '</div>';
        }
        
        // Spouses
        if (relatives.spouses.length > 0) {
            html += '<div class="person-info"><h4>Spouses</h4>';
            relatives.spouses.forEach(spouse => {
                html += `<p><a href="#" class="person-link" data-person-id="${spouse.id}">${spouse.name}</a></p>`;
            });
            html += '</div>';
        }
        
        // Children
        if (relatives.children.length > 0) {
            html += '<div class="person-info"><h4>Children</h4>';
            relatives.children.forEach(child => {
                html += `<p><a href="#" class="person-link" data-person-id="${child.id}">${child.name}</a></p>`;
            });
            html += '</div>';
        }
        
        // Siblings
        if (relatives.siblings.length > 0) {
            html += '<div class="person-info"><h4>Siblings</h4>';
            relatives.siblings.forEach(sibling => {
                html += `<p><a href="#" class="person-link" data-person-id="${sibling.id}">${sibling.name}</a></p>`;
            });
            html += '</div>';
        }
        
        // Source references
        if (person.sourceRefs && person.sourceRefs.length > 0) {
            html += '<div class="person-info"><h4>Sources</h4>';
            person.sourceRefs.forEach(ref => {
                html += `<p><span class="label">Reference:</span> ${ref}</p>`;
            });
            html += '</div>';
        }
        
        // Add event listeners to person links
        setTimeout(() => {
            const personLinks = this.personDetailsContent.querySelectorAll('.person-link');
            personLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const personId = link.dataset.personId;
                    const targetPerson = this.familyTree.getPerson(personId);
                    if (targetPerson) {
                        this.familyTree.focusOnPerson(personId);
                        this.showPersonDetails(targetPerson);
                    }
                });
            });
        }, 0);
        
        return html;
    }

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.familyTree && this.familyTree.zoomIn) {
            this.familyTree.zoomIn();
        }
    }

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.familyTree && this.familyTree.zoomOut) {
            this.familyTree.zoomOut();
        }
    }

    /**
     * Reset view
     */
    resetView() {
        this.familyTree.resetView();
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    /**
     * Show help modal
     */
    showHelp() {
        const helpModal = document.getElementById('help-modal');
        helpModal.classList.add('active');
    }

    /**
     * Hide help modal
     */
    hideHelp() {
        const helpModal = document.getElementById('help-modal');
        helpModal.classList.remove('active');
    }

    /**
     * Handle clicks outside panels
     */
    handleOutsideClick(event) {
        // Close search panel if clicking outside
        if (!this.searchPanel.contains(event.target) && 
            !this.searchBtn.contains(event.target) &&
            this.searchPanel.classList.contains('active')) {
            this.hideSearchPanel();
        }
        
        // Close person details if clicking outside
        if (!this.personDetailsPanel.contains(event.target) &&
            this.personDetailsPanel.classList.contains('active')) {
            this.hidePersonDetails();
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(event) {
        // Only handle shortcuts when not typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'f':
            case 'F':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.toggleSearchPanel();
                }
                break;
            case 'Escape':
                this.hideSearchPanel();
                this.hidePersonDetails();
                this.hideHelp();
                break;
            case 'h':
            case 'H':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.showHelp();
                }
                break;
            case '0':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.resetView();
                }
                break;
            case '+':
            case '=':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.zoomIn();
                }
                break;
            case '-':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.zoomOut();
                }
                break;
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.loadingIndicator.style.display = 'block';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        this.loadingIndicator.style.display = 'none';
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    /**
     * Update tree data
     */
    updateTreeData(newData) {
        this.familyTree.updateData(newData);
        this.showNotification('Family tree updated successfully', 'success');
    }

    /**
     * Get family tree instance
     */
    getFamilyTree() {
        return this.familyTree;
    }
}

// Export for use in other modules
window.UIController = UIController;
