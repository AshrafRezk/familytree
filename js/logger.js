(function() {
  const stored = localStorage.getItem('ft_logs');
  const logs = stored ? JSON.parse(stored) : [];

  function persist() {
    try {
      localStorage.setItem('ft_logs', JSON.stringify(logs.slice(-1000)));
    } catch (_) {
      /* ignore storage errors */
    }
  }

  function format(level, args) {
    return `[${new Date().toISOString()}] ${level.toUpperCase()}: ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}`;
  }

  ['log', 'info', 'warn', 'error'].forEach(level => {
    const original = console[level];
    console[level] = (...args) => {
      logs.push(format(level, args));
      if (typeof original === 'function') {
        original.apply(console, args);
      }
      persist();
    };
  });

  window.FTLogger = {
    getLogs() {
      return logs.slice();
    },
    download() {
      const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'familytree.log';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    clear() {
      logs.length = 0;
      persist();
    }
  };
})();
