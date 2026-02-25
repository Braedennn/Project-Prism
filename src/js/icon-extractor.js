/**
 * Prism Launcher — Icon Extractor
 * Handles icon extraction from EXE files via the main process.
 * Manages icon caching and fallback generation.
 */

const IconExtractor = (() => {
  /**
   * Extract icon from an EXE file
   * Delegates to main process which handles the fallback chain:
   *   1. exe-icon-extractor module
   *   2. PowerShell .NET System.Drawing
   *   3. Default cover image
   *
   * @param {string} exePath - Full path to the .exe file
   * @returns {Promise<{success: boolean, iconPath: string, gameId: string}>}
   */
  async function extract(exePath) {
    try {
      const result = await window.prismAPI.extractIcon(exePath);
      return result;
    } catch (err) {
      console.error('Icon extraction failed:', err);
      return {
        success: false,
        iconPath: null,
        gameId: Utils.generateId()
      };
    }
  }

  /**
   * Get the display source for a game's icon
   * Returns either the file URL to the extracted icon or null for fallback
   *
   * @param {object} game - The game object
   * @returns {string|null}
   */
  function getIconSrc(game) {
    if (game.iconPath) {
      return Utils.pathToFileUrl(game.iconPath);
    }
    return null;
  }

  /**
   * Check if a game has a valid icon file
   *
   * @param {object} game - The game object
   * @returns {boolean}
   */
  function hasIcon(game) {
    return !!game.iconPath;
  }

  return {
    extract,
    getIconSrc,
    hasIcon
  };
})();
