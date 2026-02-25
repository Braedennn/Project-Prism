/**
 * Prism Launcher — Settings Panel
 * Manages user preferences and settings persistence.
 * Saves to both localStorage (renderer) and main process (for behavior settings).
 */

const Settings = (() => {
  const STORAGE_KEY = 'prism-settings';
  let settings = {
    animations: true,
    reduceMotion: false,
    defaultView: 'grid',
    sortBy: 'name',
    minToTray: false,
    minOnLaunch: false,
    confirmRemove: true,
    notifications: true
  };

  async function init() {
    await loadSettings();
    bindEvents();
    applySettings();
    syncToMain();
  }

  async function loadSettings() {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        settings = { ...settings, ...JSON.parse(stored) };
      }
    } catch (err) {
      console.warn('Failed to load settings from localStorage:', err);
    }

    // Also load from main process (in case localStorage was cleared)
    try {
      const mainSettings = await window.prismAPI.getMainSettings();
      if (mainSettings) {
        // Main process settings override for behavior keys
        settings.minToTray = mainSettings.minToTray ?? settings.minToTray;
        settings.minOnLaunch = mainSettings.minOnLaunch ?? settings.minOnLaunch;
        settings.confirmRemove = mainSettings.confirmRemove ?? settings.confirmRemove;
        settings.notifications = mainSettings.notifications ?? settings.notifications;
      }
    } catch (err) {
      console.warn('Failed to load settings from main process:', err);
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }

  /**
   * Sync behavior settings to main process
   */
  function syncToMain() {
    try {
      window.prismAPI.setAllSettings({
        minToTray: settings.minToTray,
        minOnLaunch: settings.minOnLaunch,
        confirmRemove: settings.confirmRemove,
        notifications: settings.notifications
      });
    } catch (err) {
      console.warn('Failed to sync settings to main:', err);
    }
  }

  function bindToggle(id, key, onChange) {
    const el = Utils.$(id);
    if (!el) return;
    el.checked = settings[key];
    el.addEventListener('change', () => {
      settings[key] = el.checked;
      saveSettings();
      syncToMain();
      if (onChange) onChange(el.checked);
    });
  }

  function bindSelect(id, key, onChange) {
    const el = Utils.$(id);
    if (!el) return;
    el.value = settings[key];
    el.addEventListener('change', () => {
      settings[key] = el.value;
      saveSettings();
      if (onChange) onChange(el.value);
    });
  }

  function bindEvents() {
    // Animations toggle
    bindToggle('#settingAnimations', 'animations', (val) => {
      AnimationEngine.setEnabled(val);
    });

    // Reduce motion toggle
    bindToggle('#settingReduceMotion', 'reduceMotion', (val) => {
      if (val) {
        AnimationEngine.setEnabled(false);
        const animEl = Utils.$('#settingAnimations');
        if (animEl) {
          animEl.checked = false;
          settings.animations = false;
          saveSettings();
        }
      }
    });

    // Behavior toggles — all sync to main process automatically via bindToggle
    bindToggle('#settingMinToTray', 'minToTray');
    bindToggle('#settingMinOnLaunch', 'minOnLaunch');
    bindToggle('#settingConfirmRemove', 'confirmRemove');
    bindToggle('#settingNotifications', 'notifications');

    // Selects
    bindSelect('#settingDefaultView', 'defaultView');
    bindSelect('#settingSortBy', 'sortBy', () => {
      // Trigger library refresh when sort changes
      App.refreshLibraryView();
    });

    // Open data directory
    Utils.$('#btnOpenDataDir').addEventListener('click', () => {
      window.prismAPI.openDataDir();
    });
  }

  function applySettings() {
    AnimationEngine.setEnabled(settings.animations && !settings.reduceMotion);
  }

  function get(key) {
    return settings[key];
  }

  return { init, get };
})();
