/**
 * Prism Launcher — Library Manager
 * CRUD operations for the game library.
 * Handles persistence via the main process IPC.
 */

const LibraryManager = (() => {
  let libraryData = { games: [], lastPlayed: null };
  let onChangeCallbacks = [];
  const runningGames = new Set();

  /**
   * Load library data from disk
   */
  async function load() {
    try {
      const data = await window.prismAPI.loadLibrary();
      libraryData = data || { games: [], lastPlayed: null };
      notifyChange();
    } catch (err) {
      console.error('Failed to load library:', err);
      libraryData = { games: [], lastPlayed: null };
    }
    return libraryData;
  }

  /**
   * Save library data to disk
   */
  async function save() {
    try {
      await window.prismAPI.saveLibrary(libraryData);
    } catch (err) {
      console.error('Failed to save library:', err);
      Notifications.error('Failed to save library data');
    }
  }

  /**
   * Get all games
   */
  function getGames() {
    return libraryData.games;
  }

  /**
   * Get a game by its ID
   */
  function getGameById(id) {
    return libraryData.games.find(g => g.id === id) || null;
  }

  /**
   * Add a new game to the library
   */
  async function addGame(gameData) {
    const game = {
      id: gameData.id || Utils.generateId(),
      title: gameData.title,
      exePath: gameData.exePath,
      iconPath: gameData.iconPath || null,
      addedAt: new Date().toISOString(),
      lastPlayedAt: null,
      playCount: 0,
      totalPlaytime: 0
    };

    libraryData.games.push(game);
    await save();
    notifyChange();
    return game;
  }

  /**
   * Update an existing game
   */
  async function updateGame(id, updates) {
    const index = libraryData.games.findIndex(g => g.id === id);
    if (index === -1) return null;

    libraryData.games[index] = { ...libraryData.games[index], ...updates };
    await save();
    notifyChange();
    return libraryData.games[index];
  }

  /**
   * Remove a game from the library
   */
  async function removeGame(id) {
    const index = libraryData.games.findIndex(g => g.id === id);
    if (index === -1) return false;

    libraryData.games.splice(index, 1);

    if (libraryData.lastPlayed === id) {
      libraryData.lastPlayed = null;
    }

    await save();
    notifyChange();
    return true;
  }

  /**
   * Record that a game was played (updates lastPlayed)
   */
  async function recordPlay(id) {
    const game = getGameById(id);
    if (!game) return;

    game.lastPlayedAt = new Date().toISOString();
    game.playCount = (game.playCount || 0) + 1;
    libraryData.lastPlayed = id;
    await save();
    notifyChange();
  }

  /**
   * Get the last played game
   */
  function getLastPlayed() {
    if (!libraryData.lastPlayed) return null;
    return getGameById(libraryData.lastPlayed);
  }

  /**
   * Subscribe to library changes
   */
  function onChange(callback) {
    onChangeCallbacks.push(callback);
  }

  /**
   * Notify all subscribers of a change
   */
  function notifyChange() {
    onChangeCallbacks.forEach(cb => cb(libraryData));
  }

  /**
   * Search games by title
   */
  function search(query) {
    if (!query || !query.trim()) return libraryData.games;
    const q = query.toLowerCase().trim();
    return libraryData.games.filter(g =>
      g.title.toLowerCase().includes(q)
    );
  }

  /**
   * Toggle favorite status for a game
   */
  async function toggleFavorite(id) {
    const game = getGameById(id);
    if (!game) return;
    game.favorite = !game.favorite;
    await save();
    notifyChange();
    return game.favorite;
  }

  /**
   * Get all favorite games
   */
  function getFavorites() {
    return libraryData.games.filter(g => g.favorite);
  }

  /**
   * Get recently played games (sorted by lastPlayedAt, only those that have been played)
   */
  function getRecentlyPlayed() {
    return libraryData.games
      .filter(g => g.lastPlayedAt)
      .sort((a, b) => new Date(b.lastPlayedAt) - new Date(a.lastPlayedAt));
  }

  /**
   * Get games sorted by total playtime (descending)
   */
  function getByPlaytime() {
    return [...libraryData.games]
      .sort((a, b) => (b.totalPlaytime || 0) - (a.totalPlaytime || 0));
  }

  /**
   * Get total stats across all games
   */
  function getStats() {
    const games = libraryData.games;
    const totalPlaytime = games.reduce((sum, g) => sum + (g.totalPlaytime || 0), 0);
    const totalSessions = games.reduce((sum, g) => sum + (g.playCount || 0), 0);
    const totalGames = games.length;
    const mostPlayed = [...games].sort((a, b) => (b.totalPlaytime || 0) - (a.totalPlaytime || 0));
    return { totalPlaytime, totalSessions, totalGames, mostPlayed };
  }

  /**
   * Mark a game as currently running
   */
  function setRunning(gameId) {
    runningGames.add(gameId);
    notifyChange();
  }

  /**
   * Mark a game as no longer running
   */
  function clearRunning(gameId) {
    runningGames.delete(gameId);
    notifyChange();
  }

  /**
   * Check if a game is currently running
   */
  function isRunning(gameId) {
    return runningGames.has(gameId);
  }

  return {
    load,
    save,
    getGames,
    getGameById,
    addGame,
    updateGame,
    removeGame,
    recordPlay,
    getLastPlayed,
    onChange,
    search,
    setRunning,
    clearRunning,
    isRunning,
    toggleFavorite,
    getFavorites,
    getRecentlyPlayed,
    getByPlaytime,
    getStats
  };
})();
