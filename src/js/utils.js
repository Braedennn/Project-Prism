/**
 * Prism Launcher — Utility Functions
 * Helper functions used across all modules.
 */

const Utils = (() => {
  /**
   * Generate a UUID v4
   */
  function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Query a single DOM element
   */
  function $(selector, parent = document) {
    return parent.querySelector(selector);
  }

  /**
   * Query all matching DOM elements
   */
  function $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  }

  /**
   * Create a DOM element with attributes and children
   */
  function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'dataset') {
        for (const [dk, dv] of Object.entries(value)) {
          el.dataset[dk] = dv;
        }
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    }

    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });

    return el;
  }

  /**
   * Get the first letter(s) for fallback tiles
   */
  function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }

  /**
   * Extract a clean game name from a full EXE path.
   * Strips: extension, version numbers (v1.2.3), build tags (x64, win, beta),
   * underscores/dashes as separators, and trailing junk.
   * "MIMESIS.exe" → "MIMESIS"
   * "My_Game_v1.2.3_x64.exe" → "My Game"
   * "CoolGame-beta-2024.exe" → "CoolGame"
   * "Game_Setup_1.0.exe" → "Game Setup"
   */
  function getFileNameFromPath(filePath) {
    if (!filePath) return '';
    const parts = filePath.replace(/\\/g, '/').split('/');
    let name = parts[parts.length - 1];

    // Remove extension
    name = name.replace(/\.[^.]+$/, '');

    // Remove common build/version patterns
    // Strip version patterns like v1.2.3, _1.0.0, -2.1, etc.
    name = name.replace(/[-_ .]v?\d+(\.\d+){1,3}([-_.]\w+)?$/i, '');
    name = name.replace(/[-_ ](v\d+.*)$/i, '');

    // Strip common build tags at the end
    name = name.replace(/[-_ ]?(x64|x86|win64|win32|win|windows|setup|install|portable|beta|alpha|release|final|build\d*)$/gi, '');

    // Strip trailing separators
    name = name.replace(/[-_ ]+$/, '');

    // Replace underscores and multiple dashes/dots with spaces
    name = name.replace(/[_]+/g, ' ');
    name = name.replace(/[-]{2,}/g, ' ');

    // Clean up multiple spaces
    name = name.replace(/\s+/g, ' ').trim();

    return name || 'Unknown Game';
  }

  /**
   * Format a date to a readable string
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  /**
   * Debounce a function
   */
  function debounce(fn, delay = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Convert a file path to a file:// URL safe for img src
   */
  function pathToFileUrl(filePath) {
    if (!filePath) return '';
    // Normalize backslashes and encode for file protocol
    const normalized = filePath.replace(/\\/g, '/');
    return `file:///${normalized.replace(/^\/+/, '')}`;
  }

  /**
   * Format playtime in seconds to a human-readable string
   * 0 → "No time"
   * 45 → "< 1 min"
   * 120 → "2 min"
   * 3700 → "1.0 hrs"
   * 7200 → "2.0 hrs"
   * 36000 → "10.0 hrs"
   */
  function formatPlaytime(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return 'No time';
    if (totalSeconds < 60) return '< 1 min';

    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes} min`;

    const hours = totalSeconds / 3600;
    return `${hours.toFixed(1)} hrs`;
  }

  return {
    generateId,
    $,
    $$,
    createElement,
    getInitials,
    getFileNameFromPath,
    formatDate,
    formatPlaytime,
    debounce,
    escapeHtml,
    pathToFileUrl
  };
})();
