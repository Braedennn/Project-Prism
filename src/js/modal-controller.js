/**
 * Prism Launcher — Modal Controller
 * Handles Add Game and Edit Game modal open/close/validation.
 */

const ModalController = (() => {
  // Add Game Modal elements
  let overlay, modal, titleInput, pathInput, iconPreview;
  let browseBtn, confirmBtn, cancelBtn, closeBtn;

  // Edit Game Modal elements
  let editOverlay, editModal, editTitleInput, editPathInput;
  let editBrowseBtn, editConfirmBtn, editCancelBtn, editCloseBtn;

  let pendingIconData = null;
  let editingGameId = null;

  function init() {
    // ── Add Game Modal ──────────────────────────────────────────
    overlay = Utils.$('#modalOverlay');
    modal = Utils.$('#addGameModal');
    titleInput = Utils.$('#gameTitle');
    pathInput = Utils.$('#gamePath');
    iconPreview = Utils.$('#iconPreview');
    browseBtn = Utils.$('#btnBrowseExe');
    confirmBtn = Utils.$('#modalConfirm');
    cancelBtn = Utils.$('#modalCancel');
    closeBtn = Utils.$('#modalClose');

    browseBtn.addEventListener('click', handleBrowse);
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', closeAddModal);
    closeBtn.addEventListener('click', closeAddModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAddModal();
    });
    titleInput.addEventListener('input', validateAddForm);

    // ── Edit Game Modal ─────────────────────────────────────────
    editOverlay = Utils.$('#editModalOverlay');
    editModal = Utils.$('#editGameModal');
    editTitleInput = Utils.$('#editGameTitle');
    editPathInput = Utils.$('#editGamePath');
    editBrowseBtn = Utils.$('#editBtnBrowseExe');
    editConfirmBtn = Utils.$('#editModalConfirm');
    editCancelBtn = Utils.$('#editModalCancel');
    editCloseBtn = Utils.$('#editModalClose');

    editBrowseBtn.addEventListener('click', handleEditBrowse);
    editConfirmBtn.addEventListener('click', handleEditConfirm);
    editCancelBtn.addEventListener('click', closeEditModal);
    editCloseBtn.addEventListener('click', closeEditModal);
    editOverlay.addEventListener('click', (e) => {
      if (e.target === editOverlay) closeEditModal();
    });

    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (overlay.classList.contains('modal-overlay--visible')) closeAddModal();
        if (editOverlay.classList.contains('modal-overlay--visible')) closeEditModal();
      }
    });
  }

  // ─── Add Game Modal ──────────────────────────────────────────────────────

  function openAddModal() {
    resetAddForm();
    overlay.classList.add('modal-overlay--visible');
    titleInput.focus();
  }

  function closeAddModal() {
    overlay.classList.remove('modal-overlay--visible');
    resetAddForm();
  }

  function resetAddForm() {
    titleInput.value = '';
    pathInput.value = '';
    iconPreview.innerHTML = '<span class="modal__icon-placeholder">No icon</span>';
    confirmBtn.disabled = true;
    pendingIconData = null;
  }

  function validateAddForm() {
    const hasTitle = titleInput.value.trim().length > 0;
    const hasPath = pathInput.value.trim().length > 0;
    confirmBtn.disabled = !(hasTitle && hasPath);
  }

  async function handleBrowse() {
    const filePath = await window.prismAPI.openFileDialog();
    if (!filePath) return;

    pathInput.value = filePath;

    // Auto-fill title from filename if empty
    if (!titleInput.value.trim()) {
      titleInput.value = Utils.getFileNameFromPath(filePath);
    }

    // Show loading spinner in icon preview
    iconPreview.innerHTML = '<div class="modal__icon-loading"></div>';

    // Extract icon
    try {
      const result = await IconExtractor.extract(filePath);
      pendingIconData = result;

      if (result.iconPath) {
        const iconUrl = Utils.pathToFileUrl(result.iconPath);
        iconPreview.innerHTML = `<img src="${iconUrl}" alt="Game icon" />`;
      } else {
        iconPreview.innerHTML = '<span class="modal__icon-placeholder">Default icon</span>';
      }
    } catch (err) {
      console.error('Icon extraction error:', err);
      iconPreview.innerHTML = '<span class="modal__icon-placeholder">Default icon</span>';
      pendingIconData = { success: false, iconPath: null, gameId: Utils.generateId() };
    }

    validateAddForm();
  }

  async function handleConfirm() {
    const title = titleInput.value.trim();
    const exePath = pathInput.value.trim();

    if (!title || !exePath) return;

    const gameData = {
      id: pendingIconData?.gameId || Utils.generateId(),
      title,
      exePath,
      iconPath: pendingIconData?.iconPath || null
    };

    await LibraryManager.addGame(gameData);
    closeAddModal();
    Notifications.success(`${title} added to your library`);
  }

  // ─── Edit Game Modal ─────────────────────────────────────────────────────

  function openEditModal(game) {
    editingGameId = game.id;
    editTitleInput.value = game.title;
    editPathInput.value = game.exePath;
    editOverlay.classList.add('modal-overlay--visible');
    editTitleInput.focus();
  }

  function closeEditModal() {
    editOverlay.classList.remove('modal-overlay--visible');
    editingGameId = null;
    editTitleInput.value = '';
    editPathInput.value = '';
  }

  async function handleEditBrowse() {
    const filePath = await window.prismAPI.openFileDialog();
    if (!filePath) return;
    editPathInput.value = filePath;
  }

  async function handleEditConfirm() {
    if (!editingGameId) return;

    const title = editTitleInput.value.trim();
    const exePath = editPathInput.value.trim();

    if (!title) {
      Notifications.warning('Please enter a game title');
      return;
    }

    await LibraryManager.updateGame(editingGameId, { title, exePath });
    closeEditModal();
    Notifications.success('Game updated successfully');

    // Refresh detail view if we're looking at this game
    if (GameDetailView.getCurrentGameId() === editingGameId) {
      GameDetailView.show(editingGameId);
    }
  }

  return {
    init,
    openAddModal,
    closeAddModal,
    openEditModal,
    closeEditModal
  };
})();
