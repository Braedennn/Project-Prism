/**
 * Prism Launcher — Search & Filter
 * Provides real-time search/filter functionality for the game library.
 */

const Search = (() => {
  let searchInput = null;
  let gameGrid = null;

  function init() {
    searchInput = Utils.$('#searchInput');
    gameGrid = Utils.$('#gameGrid');

    searchInput.addEventListener('input', Utils.debounce(handleSearch, 150));

    // Clear search with Escape when focused
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        handleSearch();
        searchInput.blur();
      }
    });

    // Ctrl+F to focus search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    });
  }

  /**
   * Execute search and re-render filtered results
   */
  function handleSearch() {
    const query = searchInput.value;
    const filtered = LibraryManager.search(query);

    GameCard.renderAll(filtered, gameGrid);
    updateEmptyState(filtered.length, query);
  }

  /**
   * Update empty state visibility based on results
   */
  function updateEmptyState(count, query) {
    const emptyState = Utils.$('#emptyState');
    const allGames = LibraryManager.getGames();

    if (allGames.length === 0) {
      emptyState.classList.add('empty-state--visible');
      gameGrid.style.display = 'none';
    } else if (count === 0 && query) {
      // No results for search, but library has games
      gameGrid.style.display = 'none';
      emptyState.classList.add('empty-state--visible');
      Utils.$('.empty-state__title', emptyState).textContent = 'No games found';
      Utils.$('.empty-state__text', emptyState).textContent = `No results for "${Utils.escapeHtml(query)}"`;
      Utils.$('.empty-state__btn', emptyState).style.display = 'none';
    } else {
      emptyState.classList.remove('empty-state--visible');
      gameGrid.style.display = '';
      // Reset empty state text
      Utils.$('.empty-state__title', emptyState).textContent = 'Your library is empty';
      Utils.$('.empty-state__text', emptyState).textContent = 'Click "Add Game" to start building your collection';
      Utils.$('.empty-state__btn', emptyState).style.display = '';
    }
  }

  /**
   * Clear the search input
   */
  function clear() {
    if (searchInput) {
      searchInput.value = '';
    }
  }

  return { init, handleSearch, clear };
})();
