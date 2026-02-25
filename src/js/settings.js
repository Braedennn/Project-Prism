/**
 * Project Prism — Settings Panel
 * Manages user preferences and settings persistence.
 * All settings are persisted via the main process (data/settings.json).
 */

const Settings = (() => {
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
  }

  async function loadSettings() {
    try {
      const mainSettings = await window.prismAPI.getMainSettings();
      if (mainSettings) {
        settings = { ...settings, ...mainSettings };
      }
    } catch (err) {
      console.warn('Failed to load settings from main process:', err);
    }
  }

  function saveSettings() {
    try {
      window.prismAPI.setAllSettings({ ...settings });
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }

  function bindToggle(id, key, onChange) {
    const el = Utils.$(id);
    if (!el) return;
    el.checked = settings[key];
    el.addEventListener('change', () => {
      settings[key] = el.checked;
      saveSettings();
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
