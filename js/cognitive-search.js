/**
 * Cognitive Search Module
 * Handles Arabic transliteration and fuzzy matching for family tree search
 */

class CognitiveSearch {
    constructor() {
        // Common Arabic names and their English transliterations (deduplicated)
        this.arabicToEnglish = {
            'أحمد': ['ahmed', 'ahmad', 'ahmet'],
            'محمد': ['mohammed', 'muhammad', 'mohamed', 'mohammad'],
            'علي': ['ali', 'aly'],
            'حسن': ['hassan', 'hasan'],
            'حسين': ['hussein', 'husain', 'husayn'],
            'عبدالله': ['abdullah', 'abdallah', 'abd allah'],
            'عبدالرحمن': ['abdulrahman', 'abdurrahman', 'abd al rahman'],
            'عبدالعزيز': ['abdulaziz', 'abdul aziz', 'abd al aziz'],
            'فاطمة': ['fatima', 'fatimah', 'fatma'],
            'عائشة': ['aisha', 'aishah', 'ayesha'],
            'خديجة': ['khadija', 'khadijah', 'khadiga'],
            'مريم': ['maryam', 'mary', 'mariam'],
            'زينب': ['zainab', 'zaynab', 'zeinab'],
            'سارة': ['sara', 'sarah'],
            'نور': ['noor', 'nur', 'nour'],
            'سليمان': ['soliman', 'sulaiman', 'suleiman'],
            'داود': ['dawood', 'dawud', 'david'],
            'إبراهيم': ['ibrahim', 'ibraheem', 'abraham'],
            'إسماعيل': ['ismail', 'ismael'],
            'يوسف': ['yusuf', 'yousef', 'joseph'],
            'عمر': ['omar', 'umar', 'omer'],
            'عثمان': ['othman', 'uthman', 'osman'],
            'أشرف': ['ashraf', 'ashraaf', 'ashraff'],
            'عبداللطيف': ['abdullatif', 'abdul latif'],
            'عبدالسلام': ['abdulsalam', 'abdul salam'],
            'عبدالغني': ['abdulghani', 'abdul ghani'],
            'عبدالوهاب': ['abdulwahab', 'abdul wahab'],
            'عبدالمنعم': ['abdulmunim', 'abdul munim'],
            'عبدالمجيد': ['abdulmajid', 'abdul majid'],
            'عبدالفتاح': ['abdulfattah', 'abdul fattah'],
            'عبدالرزاق': ['abdulrazzaq', 'abdul razzaq'],
            'عبدالستار': ['abdulsattar', 'abdul sattar'],
            'عبدالغفار': ['abdulghaffar', 'abdul ghaffar'],
            'عبدالرحيم': ['abdulrahim', 'abdul rahim'],
            'عبدالخالق': ['abdulkhaliq', 'abdul khaliq'],
            'عبدالواحد': ['abdulwahid', 'abdul wahid'],
            'عبدالرؤوف': ['abdulrauf', 'abdul rauf']
        };

        this.englishToArabic = {};
        
        // Build reverse mapping
        for (const [arabic, englishVariants] of Object.entries(this.arabicToEnglish)) {
            for (const english of englishVariants) {
                if (!this.englishToArabic[english]) {
                    this.englishToArabic[english] = [];
                }
                this.englishToArabic[english].push(arabic);
            }
        }
    }

    /**
     * Search for people with cognitive transliteration
     * @param {string} query - Search query (Arabic or English)
     * @param {Array} people - Array of people to search
     * @returns {Array} Matching people with scores
     */
    search(query, people) {
        if (!query || query.trim() === '') {
            return [];
        }

        const normalizedQuery = this.normalizeText(query.trim().toLowerCase());
        const results = [];

        for (const person of people) {
            const score = this.calculateMatchScore(normalizedQuery, person);
            if (score > 0) {
                results.push({
                    person: person,
                    score: score,
                    matchType: this.getMatchType(normalizedQuery, person)
                });
            }
        }

        // Sort by score (highest first)
        results.sort((a, b) => b.score - a.score);

        return results;
    }

    /**
     * Calculate match score for a person
     * @param {string} query - Normalized query
     * @param {Object} person - Person object
     * @returns {number} Match score (0-1)
     */
    calculateMatchScore(query, person) {
        let maxScore = 0;

        // Check main name
        const nameScore = this.getTextSimilarity(query, this.normalizeText(person.name.toLowerCase()));
        maxScore = Math.max(maxScore, nameScore);

        // Check if query is contained in name (partial match)
        const normalizedName = this.normalizeText(person.name.toLowerCase());
        if (normalizedName.includes(query) || query.includes(normalizedName)) {
            maxScore = Math.max(maxScore, 0.9);
        }

        // Check alternative names
        if (person.altNames && person.altNames.length > 0) {
            for (const altName of person.altNames) {
                const altScore = this.getTextSimilarity(query, this.normalizeText(altName.toLowerCase()));
                maxScore = Math.max(maxScore, altScore * 0.8); // Slightly lower weight for alt names
                
                // Check partial matches in alt names
                const normalizedAlt = this.normalizeText(altName.toLowerCase());
                if (normalizedAlt.includes(query) || query.includes(normalizedAlt)) {
                    maxScore = Math.max(maxScore, 0.85);
                }
            }
        }

        // Check transliterations
        const transliterationScore = this.getTransliterationScore(query, person.name);
        maxScore = Math.max(maxScore, transliterationScore);

        return maxScore;
    }

    /**
     * Get transliteration score
     * @param {string} query - Search query
     * @param {string} arabicName - Arabic name
     * @returns {number} Score (0-1)
     */
    getTransliterationScore(query, arabicName) {
        // Check if query is English and name is Arabic
        if (this.isArabic(arabicName) && !this.isArabic(query)) {
            // 1) Dictionary-based (quick path)
            const englishVariants = this.arabicToEnglish[arabicName];
            if (englishVariants) {
                for (const variant of englishVariants) {
                    const similarity = this.getTextSimilarity(query, variant);
                    if (similarity > 0.6) return similarity;
                    if (variant.includes(query) || query.includes(variant)) return 0.8;
                }
            }

            // 2) Algorithmic transliteration (general case)
            const arCandidates = this.buildArabicCandidatesFromEnglish(query);
            for (const cand of arCandidates) {
                const similarity = this.getTextSimilarity(this.normalizeText(cand), this.normalizeText(arabicName));
                if (similarity > 0.65) return similarity;
                if (this.normalizeText(arabicName).includes(this.normalizeText(cand))) return 0.85;
            }
        }

        // Check if query is Arabic and name has English variants
        if (!this.isArabic(query) && this.englishToArabic[query]) {
            const arabicVariants = this.englishToArabic[query];
            for (const variant of arabicVariants) {
                const similarity = this.getTextSimilarity(variant, arabicName);
                if (similarity > 0.6) { // Lowered threshold for better matching
                    return similarity;
                }
                // Check partial matches
                if (variant.includes(arabicName) || arabicName.includes(variant)) {
                    return 0.8;
                }
            }
        }

        // Check reverse mapping for partial matches
        for (const [arabic, englishVariants] of Object.entries(this.arabicToEnglish)) {
            for (const variant of englishVariants) {
                if (variant.includes(query) || query.includes(variant)) {
                    const similarity = this.getTextSimilarity(arabic, arabicName);
                    if (similarity > 0.5) {
                        return similarity * 0.9;
                    }
                }
            }
        }

        return 0;
    }

    /**
     * Build Arabic candidate strings from an English query (rule-based transliteration)
     * Handles common digraphs and numerals often used for Arabic sounds (e.g., 7->ح, 3->ع)
     */
    buildArabicCandidatesFromEnglish(englishQuery) {
        if (!englishQuery) return [];
        const query = englishQuery.toLowerCase().trim();

        // Numeral map used in Arabizi
        const digitMap = {
            '2': ['ء', 'ا'],
            '3': ['ع'],
            '5': ['خ'],
            '6': ['ط'],
            '7': ['ح'],
            '8': ['غ', 'ج'],
            '9': ['ص', 'ض']
        };

        // Digraphs first (order matters)
        const digraphMap = {
            'sh': ['ش'],
            'ch': ['تش', 'ش'],
            'kh': ['خ'],
            'th': ['ث', 'ذ'],
            'dh': ['ذ'],
            'gh': ['غ'],
            'ph': ['ف'],
            'aa': ['ا', ''],
            'ee': ['ي'],
            'oo': ['و'],
            'ou': ['و'],
            'ow': ['و'],
            'ai': ['ي', 'ا'],
            'ay': ['ي'],
            'ea': ['ي', 'ا'],
            'ie': ['ي']
        };

        // Single letters
        const singleMap = {
            'a': ['ا', ''], 'b': ['ب'], 'c': ['ك', 'س'], 'd': ['د'], 'e': ['ي', ''], 'f': ['ف'],
            'g': ['ج', 'غ', 'ق'], 'h': ['ه', 'ح'], 'i': ['ي'], 'j': ['ج'], 'k': ['ك'], 'l': ['ل'],
            'm': ['م'], 'n': ['ن'], 'o': ['و', ''], 'p': ['ب'], 'q': ['ق'], 'r': ['ر'], 's': ['س', 'ص'],
            't': ['ت', 'ط'], 'u': ['و', ''], 'v': ['ف'], 'w': ['و'], 'x': ['كس', 'ز'], 'y': ['ي', ''], 'z': ['ز', 'ذ']
        };

        // Tokenize by spaces, transliterate each token, then combine
        const tokens = query.split(/\s+/).filter(Boolean);
        const tokenVariants = tokens.map(token => this.transliterateToken(token, digitMap, digraphMap, singleMap));

        // Combine variants across tokens
        let results = [''];
        for (const variants of tokenVariants) {
            const next = [];
            for (const base of results) {
                for (const v of variants) {
                    next.push((base ? base + ' ' : '') + v);
                    if (next.length > 80) break; // cap to avoid explosion
                }
                if (next.length > 80) break;
            }
            results = next;
        }

        // Include original query as a loose candidate to help fuzzy match
        if (results.length === 0) results.push(query);
        return Array.from(new Set(results)).slice(0, 100);
    }

    transliterateToken(token, digitMap, digraphMap, singleMap) {
        const variants = [''];
        let i = 0;
        while (i < token.length) {
            const ch = token[i];
            const pair = i + 1 < token.length ? token.slice(i, i + 2) : null;

            let options = null;

            // Numerals
            if (digitMap[ch]) {
                options = digitMap[ch];
                i += 1;
            } else if (pair && digraphMap[pair]) {
                options = digraphMap[pair];
                i += 2;
            } else {
                options = singleMap[ch] || [ch];
                i += 1;
            }

            // Expand variants
            const next = [];
            for (const base of variants) {
                for (const opt of options) {
                    const candidate = base + opt;
                    next.push(candidate);
                    if (next.length > 120) break;
                }
                if (next.length > 120) break;
            }
            variants.length = 0;
            variants.push(...next);
        }

        // Collapse duplicates and limit size
        return Array.from(new Set(variants)).slice(0, 60);
    }

    /**
     * Check if text contains Arabic characters
     * @param {string} text - Text to check
     * @returns {boolean} True if Arabic
     */
    isArabic(text) {
        const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
        return arabicRegex.test(text);
    }

    /**
     * Normalize text for comparison
     * @param {string} text - Text to normalize
     * @returns {string} Normalized text
     */
    normalizeText(text) {
        return text
            .replace(/[أإآ]/g, 'ا') // Normalize alef
            .replace(/[ىي]/g, 'ي') // Normalize yaa
            .replace(/[ةه]/g, 'ه') // Normalize taa marbouta
            .replace(/[ؤئ]/g, 'و') // Normalize waw
            .replace(/[ء]/g, '') // Remove hamza
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    /**
     * Calculate text similarity using Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    getTextSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (str1.length === 0) return 0;
        if (str2.length === 0) return 0;

        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return 1 - (distance / maxLength);
    }

    /**
     * Calculate Levenshtein distance between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Get match type for display
     * @param {string} query - Search query
     * @param {Object} person - Person object
     * @returns {string} Match type description
     */
    getMatchType(query, person) {
        if (this.isArabic(query) && this.isArabic(person.name)) {
            return 'Exact Arabic Match';
        } else if (!this.isArabic(query) && this.isArabic(person.name)) {
            return 'English to Arabic Transliteration';
        } else if (this.isArabic(query) && !this.isArabic(person.name)) {
            return 'Arabic to English Transliteration';
        } else {
            return 'English Match';
        }
    }

    /**
     * Get search suggestions based on partial query
     * @param {string} query - Partial query
     * @param {Array} people - Array of people
     * @returns {Array} Suggestions
     */
    getSuggestions(query, people) {
        if (!query || query.length < 2) return [];

        const normalizedQuery = this.normalizeText(query.toLowerCase());
        const suggestions = new Set();

        for (const person of people) {
            const normalizedName = this.normalizeText(person.name.toLowerCase());
            
            if (normalizedName.includes(normalizedQuery)) {
                suggestions.add(person.name);
            }

            // Check alternative names
            if (person.altNames) {
                for (const altName of person.altNames) {
                    const normalizedAlt = this.normalizeText(altName.toLowerCase());
                    if (normalizedAlt.includes(normalizedQuery)) {
                        suggestions.add(altName);
                    }
                }
            }

            // Check transliterations
            if (this.isArabic(person.name)) {
                const englishVariants = this.arabicToEnglish[person.name];
                if (englishVariants) {
                    for (const variant of englishVariants) {
                        if (variant.toLowerCase().includes(normalizedQuery)) {
                            suggestions.add(variant);
                        }
                    }
                }
            }
        }

        return Array.from(suggestions).slice(0, 10);
    }
}

// Export for use in other modules
window.CognitiveSearch = CognitiveSearch;
