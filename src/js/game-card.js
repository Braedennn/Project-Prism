/**
 * Prism Launcher — Game Card Component
 * Renders game cards for the library grid and list views.
 */

const GameCard = (() => {
  function render(game, index = 0) {
    const isRunning = LibraryManager.isRunning(game.id);

    const card = Utils.createElement('div', {
      className: `game-card stagger-${Math.min(index + 1, 12)}${isRunning ? ' game-card--running' : ''}`,
      dataset: { gameId: game.id }
    });

    // Cover image or fallback
    const iconSrc = IconExtractor.getIconSrc(game);
    if (iconSrc) {
      const img = Utils.createElement('img', {
        className: 'game-card__cover',
        src: iconSrc,
        alt: game.title,
        draggable: 'false'
      });
      img.onerror = () => {
        img.replaceWith(createFallback(game.title));
      };
      card.appendChild(img);
    } else {
      card.appendChild(createFallback(game.title));
    }

    // Play overlay
    const playOverlay = Utils.createElement('div', { className: 'game-card__play-overlay' }, [
      Utils.createElement('div', { className: 'game-card__play-icon' }, [
        Utils.createElement('img', { src: 'assets/icons/play.svg', alt: '', draggable: 'false' })
      ])
    ]);
    card.appendChild(playOverlay);

    // Running badge
    if (isRunning) {
      const badge = Utils.createElement('div', { className: 'game-card__running-badge' }, ['RUNNING']);
      card.appendChild(badge);
    }

    // Glow effect
    card.appendChild(Utils.createElement('div', { className: 'game-card__glow' }));

    // Build meta text: playtime + last played
    const playtime = Utils.formatPlaytime(game.totalPlaytime || 0);
    const lastPlayed = game.lastPlayedAt ? Utils.formatDate(game.lastPlayedAt) : 'Never played';

    let metaText;
    if (isRunning) {
      metaText = 'Currently running...';
    } else if (game.totalPlaytime > 0) {
      metaText = `${playtime}  ·  ${lastPlayed}`;
    } else {
      metaText = lastPlayed;
    }

    // Info bar
    const info = Utils.createElement('div', { className: 'game-card__info' }, [
      Utils.createElement('div', { className: 'game-card__title' }, [Utils.escapeHtml(game.title)]),
      Utils.createElement('div', { className: `game-card__meta${isRunning ? ' game-card__meta--running' : ''}` }, [metaText])
    ]);
    card.appendChild(info);

    // 3D tilt effect
    AnimationEngine.applyTiltEffect(card);

    // Double-click to launch
    card.addEventListener('dblclick', (e) => {
      e.preventDefault();
      launchGame(game);
    });

    // Single click to show detail (with delay to not conflict with dblclick)
    let clickTimer = null;
    card.addEventListener('click', (e) => {
      if (e.detail === 1) {
        clickTimer = setTimeout(() => {
          GameDetailView.show(game.id);
        }, 220);
      }
    });
    card.addEventListener('dblclick', () => {
      clearTimeout(clickTimer);
    });

    // Right-click context menu
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      ContextMenu.show(e, game.id);
    });

    return card;
  }

  function createFallback(title) {
    return Utils.createElement('div', {
      className: 'game-card__fallback'
    }, [Utils.getInitials(title)]);
  }

  /**
   * Launch a game — passes gameId for playtime tracking
   */
  async function launchGame(game) {
    if (LibraryManager.isRunning(game.id)) {
      Notifications.info(`${game.title} is already running`);
      return;
    }

    try {
      const result = await window.prismAPI.launchGame(game.exePath, game.id);
      if (result.success) {
        await LibraryManager.recordPlay(game.id);
        LibraryManager.setRunning(game.id);
        Notifications.success(`Launching ${game.title}...`);

        // Minimize window if setting is enabled
        if (Settings.get('minOnLaunch')) {
          window.prismAPI.minimizeWindow();
        }
      } else {
        Notifications.error(`Failed to launch: ${result.error}`);
      }
    } catch (err) {
      Notifications.error(`Failed to launch ${game.title}`);
    }
  }

  function renderAll(games, container) {
    container.innerHTML = '';
    if (games.length === 0) return;

    const fragment = document.createDocumentFragment();
    games.forEach((game, index) => {
      fragment.appendChild(render(game, index));
    });
    container.appendChild(fragment);

    const cards = container.querySelectorAll('.game-card');
    AnimationEngine.staggerFadeIn([...cards]);
  }

  return { render, renderAll, launchGame };
})();
