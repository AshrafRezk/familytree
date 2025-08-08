/**
 * Data Converter Module
 * Converts CSV data to the required JSON format with deduplication and alias handling
 */

class DataConverter {
    constructor() {
        this.people = new Map();
        this.aliases = new Map();
        this.marriages = new Map();
        this.nextPersonId = 1;
    }

    /**
     * Convert CSV data to the required JSON format
     * @param {string} csvData - Raw CSV data
     * @returns {Object} Formatted JSON data
     */
    convertCSVToJSON(csvData) {
        console.log('Starting CSV to JSON conversion...');
        
        const lines = csvData.trim().split('\n');
        console.log(`Total lines in CSV: ${lines.length}`);
        
        const headers = lines[0].split(',').map(h => h.trim());
        console.log('CSV Headers:', headers);
        
        let processedCount = 0;
        let skippedCount = 0;
        
        // Process each line
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = this.parseCSVLine(line);
            
            if (values.length >= headers.length) {
                const person = this.createPersonFromCSV(headers, values);
                if (person) {
                    this.addPerson(person);
                    processedCount++;
                } else {
                    skippedCount++;
                }
            } else {
                skippedCount++;
                console.warn(`Line ${i + 1} has insufficient columns:`, values);
            }
        }

        console.log(`Processed ${processedCount} people, skipped ${skippedCount} lines`);

        // Process aliases and deduplication
        this.processAliases();
        console.log(`Found ${this.aliases.size} aliases/duplicates`);
        
        // Create marriages
        this.createMarriages();
        console.log(`Created ${this.marriages.size} marriages`);
        
        // Validate relationships
        this.validateRelationships();

        const result = {
            people: Array.from(this.people.values()),
            aliases: Object.fromEntries(this.aliases),
            marriages: Array.from(this.marriages.values()),
            metadata: {
                totalPeople: this.people.size,
                totalAliases: this.aliases.size,
                totalMarriages: this.marriages.size,
                lastUpdated: new Date().toISOString(),
                sourceFile: 'Family_Tree_with_Birth_Links.csv'
            }
        };
        
        console.log('Conversion completed successfully!');
        console.log('Final data summary:', {
            people: result.people.length,
            aliases: Object.keys(result.aliases).length,
            marriages: result.marriages.length
        });
        
        return result;
    }

    /**
     * Parse CSV line handling quoted values
     * @param {string} line - CSV line
     * @returns {Array} Array of values
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    /**
     * Create a person object from CSV data
     * @param {Array} headers - CSV headers
     * @param {Array} values - CSV values
     * @returns {Object|null} Person object or null if invalid
     */
    createPersonFromCSV(headers, values) {
        const person = {};
        
        // Map CSV columns to our format
        const columnMap = {
            'ID': 'originalId',
            'Full Name': 'name',
            'First Name': 'firstName',
            'Middle Name': 'middleName',
            'Last Name': 'lastName',
            'Birth Year': 'birthYear',
            'Death Year': 'deathYear',
            'Father ID': 'fatherId',
            'Mother ID': 'motherId',
            'Spouse IDs': 'spouseIds',
            'Notes/Source Page': 'sourceRefs',
            'Birth_Reference_Link': 'birthRefLink'
        };

        // Extract values
        headers.forEach((header, index) => {
            const mappedField = columnMap[header];
            if (mappedField && values[index] !== undefined) {
                let value = values[index].trim();
                
                // Handle special cases
                if (mappedField === 'birthYear' || mappedField === 'deathYear') {
                    value = value === '—' || value === '' ? null : parseInt(value) || null;
                } else if (mappedField === 'spouseIds') {
                    // Normalize spouse IDs to canonical form P-xxxxxx
                    if (value === '—' || value === '') {
                        value = [];
                    } else {
                        value = value
                            .split(',')
                            .map(id => id.trim())
                            .filter(id => id)
                            .map(id => `P-${id.padStart(6, '0')}`);
                    }
                } else if (mappedField === 'sourceRefs') {
                    value = value === '—' || value === '' ? [] : [value];
                } else if (mappedField === 'originalId') {
                    value = value === '—' || value === '' ? null : value;
                } else if (mappedField === 'fatherId' || mappedField === 'motherId') {
                    value = value === '—' || value === '' ? null : `P-${value.padStart(6, '0')}`;
                }
                
                person[mappedField] = value;
            }
        });

        // Generate canonical ID
        person.id = this.generatePersonId(person);
        
        // Set gender based on name patterns (Arabic names)
        person.gender = this.determineGender(person.name);
        
        // Create alternative names
        person.altNames = this.generateAlternativeNames(person);
        
        // Validate required fields
        if (!person.name || person.name === '—' || person.name === '') {
            return null;
        }

        // Debug logging for first few people
        if (this.people.size < 5) {
            console.log('Created person:', {
                id: person.id,
                name: person.name,
                gender: person.gender,
                birthYear: person.birthYear,
                fatherId: person.fatherId,
                motherId: person.motherId,
                spouseIds: person.spouseIds
            });
        }

        return person;
    }

    /**
     * Generate a canonical person ID
     * @param {Object} person - Person object
     * @returns {string} Canonical ID
     */
    generatePersonId(person) {
        if (person.originalId && person.originalId !== '—') {
            return `P-${person.originalId.padStart(6, '0')}`;
        }
        
        // Generate based on name and birth year
        const nameHash = this.hashString(person.name);
        const birthYear = person.birthYear || 0;
        return `P-${(nameHash % 1000000).toString().padStart(6, '0')}`;
    }

    /**
     * Simple string hash function
     * @param {string} str - String to hash
     * @returns {number} Hash value
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Determine gender based on name patterns
     * @param {string} name - Person's name
     * @returns {string} 'M', 'F', or null
     */
    determineGender(name) {
        if (!name) return null;
        
        const nameLower = name.toLowerCase();
        
        // Arabic male name patterns
        const malePatterns = [
            'أبو', 'محمد', 'أحمد', 'علي', 'حسن', 'حسين', 'عبد', 'مصطفى', 'يوسف',
            'إبراهيم', 'إسماعيل', 'داود', 'سليمان', 'يعقوب', 'يوسف', 'أيوب',
            'محارب', 'بولس', 'باخوم', 'نصيف', 'أمين', 'عدلي', 'نجيب', 'فريد',
            'صبحي', 'كمال', 'فيليب', 'أنطون', 'مدحت', 'عماد', 'ماهر', 'مراد',
            'باسم', 'كريم', 'نادر', 'هاني', 'فارس', 'رضا', 'توفيق', 'أمير',
            'شادي', 'راجي', 'ماجد', 'زاهر', 'فخري', 'عزيز', 'وليع', 'صلاح',
            'مكرم', 'دانيال', 'وليام', 'جرجس', 'بشاي', 'نسيم', 'جرجاوي', 'صبحي',
            'رؤوف', 'ورنيقون', 'نصحي', 'أواراد', 'فوزي', 'سلطان', 'جرجس', 'بشاي'
        ];
        
        // Arabic female name patterns
        const femalePatterns = [
            'فاطمة', 'عائشة', 'خديجة', 'زينب', 'مريم', 'فاطمة', 'سارة', 'هاجر',
            'مخدومة', 'قسطة', 'سويحة', 'لوسيا', 'بني', 'فهيمة', 'زكري', 'رسما',
            'فؤاد', 'بدرة', 'لويزرة', 'وجينة', 'بلانش', 'أمل', 'صبحي', 'كامل',
            'فوزي', 'سمير', 'ماجد', 'نبيلة', 'سوزان', 'رندا', 'عايدة', 'مارك',
            'رينا', 'دريب', 'إيفلين', 'سلمى', 'ملك', 'بهمن', 'لوسي', 'وداد',
            'منال', 'سيلفيا', 'نسرين', 'سارة', 'منال', 'موريس', 'كريستين',
            'كارولين', 'ياسمة', 'كونشيتا', 'أولديت', 'بيسي', 'سرية', 'برثانية',
            'جميلة', 'منى', 'روندا', 'شيرين', 'تيموثي', 'كارول', 'رفيق', 'تيريز',
            'أمير', 'ياسمين', 'داليا', 'أماني', 'أيفون', 'يانثا', 'نظيرة', 'عنة',
            'قسيمة', 'منيرة', 'عطية', 'شدي', 'سميحة', 'ماري', 'آن', 'إليز',
            'ليلي', 'كدواثي', 'تيريز', 'نسيب', 'نصيف', 'الخراط', 'أمل', 'فوزي',
            'سلطان', 'رحمة', 'محفوظ', 'إستر', 'حكيم', 'ماري', 'شماس', 'آن',
            'ماري', 'روي', 'تيريان', 'ليلي', 'كدواثي', 'كيلير', 'أواراد'
        ];
        
        for (const pattern of malePatterns) {
            if (nameLower.includes(pattern.toLowerCase())) {
                return 'M';
            }
        }
        
        for (const pattern of femalePatterns) {
            if (nameLower.includes(pattern.toLowerCase())) {
                return 'F';
            }
        }
        
        return null;
    }

    /**
     * Generate alternative names for a person
     * @param {Object} person - Person object
     * @returns {Array} Array of alternative names
     */
    generateAlternativeNames(person) {
        const altNames = [];
        
        // Add first name only
        if (person.firstName && person.firstName !== '—') {
            altNames.push(person.firstName);
        }
        
        // Add first + middle name
        if (person.firstName && person.middleName && 
            person.firstName !== '—' && person.middleName !== '—') {
            altNames.push(`${person.firstName} ${person.middleName}`);
        }
        
        // Add middle + last name
        if (person.middleName && person.lastName && 
            person.middleName !== '—' && person.lastName !== '—') {
            altNames.push(`${person.middleName} ${person.lastName}`);
        }
        
        // Remove duplicates
        return [...new Set(altNames)];
    }

    /**
     * Add a person to the collection
     * @param {Object} person - Person object
     */
    addPerson(person) {
        // Check for duplicates by name and birth year
        const existingPerson = this.findDuplicatePerson(person);
        
        if (existingPerson) {
            // Create alias mapping
            this.aliases.set(person.id, existingPerson.id);
            return;
        }
        
        // Add to collection
        this.people.set(person.id, person);
    }

    /**
     * Find duplicate person by name and birth year
     * @param {Object} person - Person to check
     * @returns {Object|null} Existing person or null
     */
    findDuplicatePerson(person) {
        for (const existingPerson of this.people.values()) {
            if (this.isSamePerson(person, existingPerson)) {
                return existingPerson;
            }
        }
        return null;
    }

    /**
     * Check if two people are the same
     * @param {Object} person1 - First person
     * @param {Object} person2 - Second person
     * @returns {boolean} True if same person
     */
    isSamePerson(person1, person2) {
        // Check name similarity
        const nameSimilarity = this.calculateNameSimilarity(person1.name, person2.name);
        if (nameSimilarity < 0.8) return false;
        
        // Check birth year
        if (person1.birthYear && person2.birthYear) {
            if (Math.abs(person1.birthYear - person2.birthYear) > 2) return false;
        }
        
        // Check alternative names
        const altNames1 = person1.altNames || [];
        const altNames2 = person2.altNames || [];
        
        for (const altName1 of altNames1) {
            for (const altName2 of altNames2) {
                if (this.calculateNameSimilarity(altName1, altName2) > 0.9) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Calculate similarity between two names
     * @param {string} name1 - First name
     * @param {string} name2 - Second name
     * @returns {number} Similarity score (0-1)
     */
    calculateNameSimilarity(name1, name2) {
        if (!name1 || !name2) return 0;
        
        const words1 = name1.toLowerCase().split(/\s+/);
        const words2 = name2.toLowerCase().split(/\s+/);
        
        let matches = 0;
        let total = Math.max(words1.length, words2.length);
        
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                    matches++;
                    break;
                }
            }
        }
        
        return matches / total;
    }

    /**
     * Process aliases and update references
     */
    processAliases() {
        // Update all references to use canonical IDs
        for (const person of this.people.values()) {
            if (person.fatherId) {
                person.fatherId = this.getCanonicalId(person.fatherId);
            }
            if (person.motherId) {
                person.motherId = this.getCanonicalId(person.motherId);
            }
            if (person.spouseIds) {
                person.spouseIds = person.spouseIds.map(id => this.getCanonicalId(id)).filter(id => id);
            }
        }
    }

    /**
     * Get canonical ID for a given ID
     * @param {string} id - Original ID
     * @returns {string|null} Canonical ID or null if not found
     */
    getCanonicalId(id) {
        if (!id) return null;
        
        const canonicalId = this.aliases.get(id);
        if (canonicalId) {
            return canonicalId;
        }
        
        // Check if ID exists in people
        if (this.people.has(id)) {
            return id;
        }
        
        return null;
    }

    /**
     * Create marriage objects
     */
    createMarriages() {
        const marriageMap = new Map();
        
        for (const person of this.people.values()) {
            if (person.spouseIds && person.spouseIds.length > 0) {
                for (const spouseId of person.spouseIds) {
                    if (spouseId && spouseId !== person.id) {
                        const marriageId = this.generateMarriageId(person.id, spouseId);
                        
                        if (!marriageMap.has(marriageId)) {
                            marriageMap.set(marriageId, {
                                id: marriageId,
                                spouse1Id: person.id,
                                spouse2Id: spouseId,
                                children: []
                            });
                        }
                    }
                }
            }
        }
        
        // Find children for each marriage
        for (const person of this.people.values()) {
            if (person.fatherId && person.motherId) {
                const marriageId = this.generateMarriageId(person.fatherId, person.motherId);
                const marriage = marriageMap.get(marriageId);
                
                if (marriage) {
                    marriage.children.push(person.id);
                }
            }
        }
        
        this.marriages = marriageMap;
    }

    /**
     * Generate marriage ID
     * @param {string} spouse1Id - First spouse ID
     * @param {string} spouse2Id - Second spouse ID
     * @returns {string} Marriage ID
     */
    generateMarriageId(spouse1Id, spouse2Id) {
        const sortedIds = [spouse1Id, spouse2Id].sort();
        return `M-${sortedIds[0]}_${sortedIds[1]}`;
    }

    /**
     * Validate relationships and remove invalid references
     */
    validateRelationships() {
        for (const person of this.people.values()) {
            // Validate father
            if (person.fatherId && !this.people.has(person.fatherId)) {
                person.fatherId = null;
            }
            
            // Validate mother
            if (person.motherId && !this.people.has(person.motherId)) {
                person.motherId = null;
            }
            
            // Validate spouses
            if (person.spouseIds) {
                person.spouseIds = person.spouseIds.filter(id => this.people.has(id));
            }
            
            // Prevent self-references
            if (person.fatherId === person.id) person.fatherId = null;
            if (person.motherId === person.id) person.motherId = null;
            if (person.spouseIds) {
                person.spouseIds = person.spouseIds.filter(id => id !== person.id);
            }
        }
    }

    /**
     * Export data to JSON format
     * @returns {string} JSON string
     */
    exportToJSON() {
        const data = {
            people: Array.from(this.people.values()),
            aliases: Object.fromEntries(this.aliases),
            marriages: Array.from(this.marriages.values()),
            metadata: {
                totalPeople: this.people.size,
                totalAliases: this.aliases.size,
                totalMarriages: this.marriages.size,
                lastUpdated: new Date().toISOString()
            }
        };
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * Load data from JSON format
     * @param {Object} data - JSON data
     */
    loadFromJSON(data) {
        this.people.clear();
        this.aliases.clear();
        this.marriages.clear();
        
        if (data.people) {
            for (const person of data.people) {
                this.people.set(person.id, person);
            }
        }
        
        if (data.aliases) {
            for (const [alias, canonical] of Object.entries(data.aliases)) {
                this.aliases.set(alias, canonical);
            }
        }
        
        if (data.marriages) {
            for (const marriage of data.marriages) {
                this.marriages.set(marriage.id, marriage);
            }
        }
    }
}

// Export for use in other modules
window.DataConverter = DataConverter;
