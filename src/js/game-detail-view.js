/**
 * Prism Launcher — Game Detail View
 * Renders the full detail/hero view for a selected game.
 */

const GameDetailView = (() => {
  let currentGameId = null;

  /**
   * Show the detail view for a game
   */
  function show(gameId) {
    const game = LibraryManager.getGameById(gameId);
    if (!game) return;

    currentGameId = gameId;
    const container = Utils.$('#gameDetail');
    container.innerHTML = '';

    // Back button
    const backBtn = Utils.createElement('button', {
      className: 'game-detail__back',
      onClick: () => hide()
    }, [
      Utils.createElement('img', { src: 'assets/icons/play.svg', alt: '' }),
      'Back to Library'
    ]);
    container.appendChild(backBtn);

    // Hero banner (blurred icon as background)
    const hero = Utils.createElement('div', { className: 'game-detail__hero' });
    const iconSrc = IconExtractor.getIconSrc(game);

    if (iconSrc) {
      hero.appendChild(Utils.createElement('img', {
        className: 'game-detail__hero-img',
        src: iconSrc,
        alt: ''
      }));
    } else {
      hero.appendChild(Utils.createElement('div', {
        className: 'game-detail__hero-fallback'
      }));
    }
    hero.appendChild(Utils.createElement('div', { className: 'game-detail__hero-overlay' }));
    container.appendChild(hero);

    // Content section
    const content = Utils.createElement('div', { className: 'game-detail__content' });

    // Game icon
    const iconWrapper = Utils.createElement('div', { className: 'game-detail__icon-wrapper' });
    if (iconSrc) {
      const iconImg = Utils.createElement('img', {
        className: 'game-detail__icon',
        src: iconSrc,
        alt: game.title
      });
      iconImg.onerror = () => {
        iconImg.replaceWith(Utils.createElement('div', {
          className: 'game-detail__icon-fallback'
        }, [Utils.getInitials(game.title)]));
      };
      iconWrapper.appendChild(iconImg);
    } else {
      iconWrapper.appendChild(Utils.createElement('div', {
        className: 'game-detail__icon-fallback'
      }, [Utils.getInitials(game.title)]));
    }
    content.appendChild(iconWrapper);

    // Info section
    const info = Utils.createElement('div', { className: 'game-detail__info' });

    info.appendChild(Utils.createElement('h1', {
      className: 'game-detail__title'
    }, [Utils.escapeHtml(game.title)]));

    info.appendChild(Utils.createElement('p', {
      className: 'game-detail__path'
    }, [Utils.escapeHtml(game.exePath)]));

    // Actions
    const actions = Utils.createElement('div', { className: 'game-detail__actions' });
    const isRunning = LibraryManager.isRunning(game.id);

    // Play button or Running indicator
    if (isRunning) {
      const runningBtn = Utils.createElement('div', {
        className: 'btn btn--running game-detail__play-btn'
      }, ['RUNNING']);
      actions.appendChild(runningBtn);
    } else {
      const playBtn = Utils.createElement('button', {
        className: 'btn btn--play game-detail__play-btn',
        onClick: (e) => {
          AnimationEngine.createRipple(e, playBtn);
          GameCard.launchGame(game);
        }
      }, [
        Utils.createElement('img', { src: 'assets/icons/play.svg', alt: '' }),
        'PLAY'
      ]);
      actions.appendChild(playBtn);
    }

    // Open folder button
    actions.appendChild(Utils.createElement('button', {
      className: 'game-detail__action-btn',
      title: 'Open file location',
      onClick: () => {
        const dir = game.exePath.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
        window.prismAPI.openPath(dir);
      }
    }, [
      Utils.createElement('img', { src: 'assets/icons/folder.svg', alt: 'Open folder' })
    ]));

    // Edit button
    actions.appendChild(Utils.createElement('button', {
      className: 'game-detail__action-btn',
      title: 'Edit game',
      onClick: () => {
        ModalController.openEditModal(game);
      }
    }, [
      Utils.createElement('img', { src: 'assets/icons/edit.svg', alt: 'Edit' })
    ]));

    // Delete button
    actions.appendChild(Utils.createElement('button', {
      className: 'game-detail__action-btn game-detail__action-btn--danger',
      title: 'Remove game',
      onClick: async () => {
        if (confirm(`Remove "${game.title}" from your library?`)) {
          await LibraryManager.removeGame(game.id);
          hide();
          Notifications.info(`${game.title} removed from library`);
        }
      }
    }, [
      Utils.createElement('img', { src: 'assets/icons/trash.svg', alt: 'Remove' })
    ]));

    info.appendChild(actions);
    content.appendChild(info);
    container.appendChild(content);

    // Stats
    const stats = Utils.createElement('div', { className: 'game-detail__stats' });

    stats.appendChild(createStat('Playtime', Utils.formatPlaytime(game.totalPlaytime || 0)));
    stats.appendChild(createStat('Last Played', Utils.formatDate(game.lastPlayedAt)));
    stats.appendChild(createStat('Sessions', String(game.playCount || 0)));
    stats.appendChild(createStat('Added', Utils.formatDate(game.addedAt)));

    container.appendChild(stats);

    // Switch view
    switchToView('viewGameDetail');
  }

  /**
   * Hide detail view, return to library
   */
  function hide() {
    currentGameId = null;
    switchToView('viewLibrary');
  }

  /**
   * Create a stat display element
   */
  function createStat(label, value) {
    return Utils.createElement('div', { className: 'game-detail__stat' }, [
      Utils.createElement('span', { className: 'game-detail__stat-label' }, [label]),
      Utils.createElement('span', { className: 'game-detail__stat-value' }, [value])
    ]);
  }

  /**
   * Switch between views
   */
  function switchToView(viewId) {
    Utils.$$('.view').forEach(v => v.classList.remove('view--active'));
    const target = Utils.$(`#${viewId}`);
    if (target) {
      target.classList.add('view--active');
    }
  }

  function getCurrentGameId() {
    return currentGameId;
  }

  return {
    show,
    hide,
    getCurrentGameId
  };
})();
