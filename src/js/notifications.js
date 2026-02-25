/**
 * Prism Launcher — Toast Notification System
 * Provides non-intrusive feedback for user actions.
 */

const Notifications = (() => {
  const TOAST_DURATION = 4000;
  let container = null;

  function init() {
    container = Utils.$('#toastContainer');
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {'success'|'error'|'info'|'warning'} type - Toast type
   * @param {number} duration - Display duration in ms
   */
  function show(message, type = 'info', duration = TOAST_DURATION) {
    if (!container) init();

    const toast = Utils.createElement('div', {
      className: `toast toast--${type}`
    }, [
      Utils.createElement('span', { className: 'toast__message' }, [message]),
      Utils.createElement('span', {
        className: 'toast__close',
        onClick: () => dismissToast(toast)
      }, ['\u00d7'])
    ]);

    container.appendChild(toast);

    // Auto dismiss
    const timer = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    toast._timer = timer;
  }

  /**
   * Dismiss a toast with exit animation
   */
  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;

    clearTimeout(toast._timer);
    toast.classList.add('toast--exit');

    toast.addEventListener('animationend', () => {
      toast.remove();
    }, { once: true });
  }

  /**
   * Convenience methods
   */
  function success(message) {
    show(message, 'success');
  }

  function error(message) {
    show(message, 'error');
  }

  function info(message) {
    show(message, 'info');
  }

  function warning(message) {
    show(message, 'warning');
  }

  return { init, show, success, error, info, warning };
})();
