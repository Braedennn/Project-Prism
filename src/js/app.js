/**
 * Prism Launcher — App Initialization & Routing
 * Main entry point that orchestrates all modules.
 */

const App = (() => {
  let currentView = 'library';

  async function init() {
    // Initialize all modules
    Notifications.init();
    ModalController.init();
    ContextMenu.init();
    Search.init();
    Settings.init();

    // Set up window controls
    setupWindowControls();

    // Set up sidebar navigation
    setupSidebar();

    // Set up view toggles (grid/list)
    setupViewToggles();

    // Set up add game buttons
    setupAddGameButtons();

    // Load library data
    await loadLibrary();

    // Listen for library changes
    LibraryManager.onChange(() => {
      refreshLibraryView();
      refreshActiveSubView();
    });

    // Listen for game session ended events (playtime updates from main process)
    window.prismAPI.onSessionEnded(async (data) => {
      // Clear running state
      LibraryManager.clearRunning(data.gameId);

      const formattedTime = Utils.formatPlaytime(data.elapsed);
      Notifications.info(`Session ended — ${formattedTime} played`);

      // Reload library to pick up updated playtime from disk
      await LibraryManager.load();

      // If the detail view is showing this game, re-render it
      if (GameDetailView.getCurrentGameId() === data.gameId) {
        GameDetailView.show(data.gameId);
      }
    });

    // Set app version
    try {
      const version = await window.prismAPI.getVersion();
      Utils.$('#appVersion').textContent = `v${version}`;
      Utils.$('#settingsVersion').textContent = `v${version}`;
    } catch (err) {
      console.warn('Failed to get app version');
    }

    // Apply default view setting
    const defaultView = Settings.get('defaultView');
    if (defaultView === 'list') {
      const gameGrid = Utils.$('#gameGrid');
      gameGrid.classList.add('game-grid--list');
      Utils.$$('.toolbar__view-btn').forEach(b => b.classList.remove('toolbar__view-btn--active'));
      Utils.$('.toolbar__view-btn[data-layout="list"]').classList.add('toolbar__view-btn--active');
    }
  }

  /**
   * Set up custom title bar window controls
   */
  function setupWindowControls() {
    Utils.$('#btnMinimize').addEventListener('click', () => {
      window.prismAPI.minimize();
    });

    Utils.$('#btnMaximize').addEventListener('click', () => {
      window.prismAPI.maximize();
    });

    Utils.$('#btnClose').addEventListener('click', () => {
      window.prismAPI.close();
    });
  }

  /**
   * Set up sidebar navigation
   */
  function setupSidebar() {
    const navButtons = Utils.$$('.sidebar__btn[data-view]');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewName = btn.dataset.view;
        currentView = viewName;

        // Update active button
        navButtons.forEach(b => b.classList.remove('sidebar__btn--active'));
        btn.classList.add('sidebar__btn--active');

        // Switch views
        Utils.$$('.view').forEach(v => v.classList.remove('view--active'));
        const targetView = Utils.$(`#view${capitalize(viewName)}`);
        if (targetView) {
          targetView.classList.add('view--active');
        }

        // Render the sub-view content
        renderSubView(viewName);
      });
    });
  }

  /**
   * Render content for sub-views (recent, favorites, statistics)
   */
  function renderSubView(viewName) {
    switch (viewName) {
      case 'recent':
        renderRecentView();
        break;
      case 'favorites':
        renderFavoritesView();
        break;
      case 'statistics':
        renderStatisticsView();
        break;
    }
  }

  /**
   * Refresh the currently active sub-view (called on library changes)
   */
  function refreshActiveSubView() {
    renderSubView(currentView);
  }

  /**
   * Render the Recently Played view
   */
  function renderRecentView() {
    const games = LibraryManager.getRecentlyPlayed();
    const grid = Utils.$('#recentGrid');
    const empty = Utils.$('#recentEmpty');

    GameCard.renderAll(games, grid);

    if (games.length === 0) {
      empty.style.display = '';
      grid.style.display = 'none';
    } else {
      empty.style.display = 'none';
      grid.style.display = '';
    }
  }

  /**
   * Render the Favorites view
   */
  function renderFavoritesView() {
    const games = LibraryManager.getFavorites();
    const grid = Utils.$('#favoritesGrid');
    const empty = Utils.$('#favoritesEmpty');

    GameCard.renderAll(games, grid);

    if (games.length === 0) {
      empty.style.display = '';
      grid.style.display = 'none';
    } else {
      empty.style.display = 'none';
      grid.style.display = '';
    }
  }

  /**
   * Render the Statistics view
   */
  function renderStatisticsView() {
    const container = Utils.$('#statsOverview');
    const stats = LibraryManager.getStats();
    container.innerHTML = '';

    // Stat cards
    const cards = Utils.createElement('div', { className: 'stats-overview__cards' });

    cards.appendChild(createStatCard('Total Games', String(stats.totalGames), 'in your library'));
    cards.appendChild(createStatCard('Total Playtime', Utils.formatPlaytime(stats.totalPlaytime), 'across all games'));
    cards.appendChild(createStatCard('Total Sessions', String(stats.totalSessions), 'game launches'));

    // Average per game
    const avgPlaytime = stats.totalGames > 0 ? Math.floor(stats.totalPlaytime / stats.totalGames) : 0;
    cards.appendChild(createStatCard('Avg Per Game', Utils.formatPlaytime(avgPlaytime), 'average playtime'));

    container.appendChild(cards);

    // Most played games list
    if (stats.mostPlayed.length > 0) {
      const sectionTitle = Utils.createElement('h3', { className: 'stats-overview__section-title' }, ['Most Played']);
      container.appendChild(sectionTitle);

      const list = Utils.createElement('div', { className: 'stats-overview__game-list' });

      stats.mostPlayed.slice(0, 10).forEach((game, index) => {
        const iconSrc = IconExtractor.getIconSrc(game);
        const row = Utils.createElement('div', { className: 'stats-game-row' });

        row.appendChild(Utils.createElement('span', { className: 'stats-game-row__rank' }, [String(index + 1)]));

        if (iconSrc) {
          const img = Utils.createElement('img', { className: 'stats-game-row__icon', src: iconSrc, alt: '' });
          img.onerror = () => { img.style.display = 'none'; };
          row.appendChild(img);
        } else {
          row.appendChild(Utils.createElement('div', { className: 'stats-game-row__icon' }));
        }

        const info = Utils.createElement('div', { className: 'stats-game-row__info' });
        info.appendChild(Utils.createElement('div', { className: 'stats-game-row__title' }, [Utils.escapeHtml(game.title)]));
        info.appendChild(Utils.createElement('div', { className: 'stats-game-row__meta' }, [`${game.playCount || 0} sessions`]));
        row.appendChild(info);

        row.appendChild(Utils.createElement('span', { className: 'stats-game-row__playtime' }, [Utils.formatPlaytime(game.totalPlaytime || 0)]));

        list.appendChild(row);
      });

      container.appendChild(list);
    }
  }

  /**
   * Create a stat card element
   */
  function createStatCard(label, value, sub) {
    return Utils.createElement('div', { className: 'stats-card' }, [
      Utils.createElement('span', { className: 'stats-card__label' }, [label]),
      Utils.createElement('span', { className: 'stats-card__value' }, [value]),
      Utils.createElement('span', { className: 'stats-card__sub' }, [sub])
    ]);
  }

  /**
   * Set up grid/list view toggle buttons
   */
  function setupViewToggles() {
    const toggleBtns = Utils.$$('.toolbar__view-btn');
    const gameGrid = Utils.$('#gameGrid');

    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const layout = btn.dataset.layout;

        toggleBtns.forEach(b => b.classList.remove('toolbar__view-btn--active'));
        btn.classList.add('toolbar__view-btn--active');

        if (layout === 'list') {
          gameGrid.classList.add('game-grid--list');
        } else {
          gameGrid.classList.remove('game-grid--list');
        }
      });
    });
  }

  /**
   * Set up all "Add Game" buttons
   */
  function setupAddGameButtons() {
    Utils.$('#btnAddGame').addEventListener('click', () => {
      ModalController.openAddModal();
    });

    Utils.$('#emptyAddBtn').addEventListener('click', () => {
      ModalController.openAddModal();
    });
  }

  /**
   * Load and display the game library
   */
  async function loadLibrary() {
    await LibraryManager.load();
    refreshLibraryView();
  }

  /**
   * Refresh the library view (grid + hero)
   */
  /**
   * Sort games based on the current sortBy setting
   */
  function sortGames(games) {
    const sortBy = Settings.get('sortBy') || 'name';
    const sorted = [...games];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const aDate = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
          const bDate = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
          return bDate - aDate;
        });
        break;
      case 'playtime':
        sorted.sort((a, b) => (b.totalPlaytime || 0) - (a.totalPlaytime || 0));
        break;
      case 'added':
        sorted.sort((a, b) => {
          const aDate = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bDate = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bDate - aDate;
        });
        break;
    }

    return sorted;
  }

  function refreshLibraryView() {
    const games = sortGames(LibraryManager.getGames());
    const gameGrid = Utils.$('#gameGrid');
    const emptyState = Utils.$('#emptyState');

    // Render game cards
    GameCard.renderAll(games, gameGrid);

    // Toggle empty state
    if (games.length === 0) {
      emptyState.classList.add('empty-state--visible');
      gameGrid.style.display = 'none';
    } else {
      emptyState.classList.remove('empty-state--visible');
      gameGrid.style.display = '';
    }

    // Update hero section
    updateHero();
  }

  /**
   * Update the hero section with last played game
   */
  function updateHero() {
    const lastPlayed = LibraryManager.getLastPlayed();
    const heroTitle = Utils.$('#heroTitle');
    const heroSubtitle = Utils.$('#heroSubtitle');
    const heroPlayBtn = Utils.$('#heroPlayBtn');
    const heroSection = Utils.$('#heroSection');

    if (lastPlayed) {
      heroTitle.textContent = lastPlayed.title;
      const isRunning = LibraryManager.isRunning(lastPlayed.id);
      const playtime = Utils.formatPlaytime(lastPlayed.totalPlaytime || 0);
      const lastDate = Utils.formatDate(lastPlayed.lastPlayedAt);

      if (isRunning) {
        heroSubtitle.textContent = 'Currently running...';
      } else if (lastPlayed.totalPlaytime > 0) {
        heroSubtitle.textContent = `${playtime} played  ·  Last session ${lastDate}`;
      } else {
        heroSubtitle.textContent = `Last played ${lastDate}`;
      }
      heroPlayBtn.style.display = '';

      // Set hero background from icon
      const iconSrc = IconExtractor.getIconSrc(lastPlayed);
      if (iconSrc) {
        heroSection.style.backgroundImage = `url('${iconSrc}')`;
        heroSection.style.backgroundSize = 'cover';
        heroSection.style.backgroundPosition = 'center';
        heroSection.style.filter = '';
      } else {
        heroSection.style.backgroundImage = '';
        heroSection.style.background = 'var(--color-surface-1)';
      }

      // Play button click
      heroPlayBtn.onclick = (e) => {
        AnimationEngine.createRipple(e, heroPlayBtn);
        GameCard.launchGame(lastPlayed);
      };
    } else {
      heroTitle.textContent = 'Welcome to Prism';
      heroSubtitle.textContent = 'Add your first game to get started';
      heroPlayBtn.style.display = 'none';
      heroSection.style.backgroundImage = '';
      heroSection.style.background = 'var(--color-surface-1)';
    }
  }

  /**
   * Capitalize first letter
   */
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', init);

  return { init, refreshLibraryView };
})();
