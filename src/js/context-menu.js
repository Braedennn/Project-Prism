/**
 * Prism Launcher — Context Menu
 * Right-click context menu for game cards.
 */

const ContextMenu = (() => {
  let menu = null;
  let activeGameId = null;

  function init() {
    menu = Utils.$('#contextMenu');

    // Bind action buttons
    Utils.$$('.context-menu__item', menu).forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        handleAction(action);
        hide();
      });
    });

    // Hide on click outside
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        hide();
      }
    });

    // Hide on scroll
    document.addEventListener('scroll', () => hide(), true);

    // Hide on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hide();
    });
  }

  /**
   * Show context menu at the click position
   */
  function show(event, gameId) {
    activeGameId = gameId;

    // Update favorite label
    const game = LibraryManager.getGameById(gameId);
    const favLabel = Utils.$('#ctxFavoriteLabel');
    if (game && favLabel) {
      favLabel.textContent = game.favorite ? 'Remove from Favorites' : 'Add to Favorites';
    }

    // Position the menu
    const x = event.clientX;
    const y = event.clientY;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('context-menu--visible');

    // Ensure menu doesn't overflow viewport
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (rect.right > vw) {
        menu.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > vh) {
        menu.style.top = `${y - rect.height}px`;
      }
    });
  }

  /**
   * Hide the context menu
   */
  function hide() {
    menu.classList.remove('context-menu--visible');
    activeGameId = null;
  }

  /**
   * Handle context menu actions
   */
  async function handleAction(action) {
    if (!activeGameId) return;

    const game = LibraryManager.getGameById(activeGameId);
    if (!game) return;

    switch (action) {
      case 'play':
        GameCard.launchGame(game);
        break;

      case 'detail':
        GameDetailView.show(activeGameId);
        break;

      case 'edit':
        ModalController.openEditModal(game);
        break;

      case 'open-location': {
        const dir = game.exePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        window.prismAPI.openPath(dir);
        break;
      }

      case 'favorite': {
        const isFav = await LibraryManager.toggleFavorite(activeGameId);
        Notifications.info(isFav ? `${game.title} added to favorites` : `${game.title} removed from favorites`);
        break;
      }

      case 'remove': {
        const shouldConfirm = Settings.get('confirmRemove');
        const confirmed = shouldConfirm ? confirm(`Remove "${game.title}" from your library?`) : true;
        if (confirmed) {
          await LibraryManager.removeGame(activeGameId);
          Notifications.info(`${game.title} removed from library`);

          // If we're in detail view for this game, go back
          if (GameDetailView.getCurrentGameId() === activeGameId) {
            GameDetailView.hide();
          }
        }
        break;
      }
    }
  }

  return { init, show, hide };
})();
