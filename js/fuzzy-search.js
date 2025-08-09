class FuzzySearch {
  constructor() {
    this.options = {
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: ['name', 'altNames', 'transliterations']
    };
  }

  search(query, people) {
    if (!query || !people) return [];
    const dataset = people.map(p => ({
      ...p,
      transliterations: p.altNames || []
    }));
    const fuse = new Fuse(dataset, this.options);
    return fuse.search(query).map(res => ({
      person: res.item,
      score: 1 - res.score,
      matchType: 'fuzzy'
    }));
  }
}

window.FuzzySearch = FuzzySearch;
