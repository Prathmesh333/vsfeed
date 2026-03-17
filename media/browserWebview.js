(function () {
  const vscode = acquireVsCodeApi();
  const welcomeScreen = document.getElementById('welcome-screen');
  const shortcutsContainer = document.getElementById('shortcuts-container');
  const timerDisplay = document.getElementById('timer-display');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMessage = document.getElementById('overlay-message');
  const overlayButton = document.getElementById('overlay-button');
  const urlInput = document.getElementById('url-input');
  const goButton = document.getElementById('go-button');
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  const addShortcutButton = document.getElementById('add-shortcut-button');
  const launcherStatus = document.getElementById('launcher-status');
  const initialShortcutsElement = document.getElementById('vsfeed-shortcuts-data');
  const shortcutModalBackdrop = document.getElementById('shortcut-modal-backdrop');
  const shortcutNameInput = document.getElementById('shortcut-name-input');
  const shortcutUrlInput = document.getElementById('shortcut-url-input');
  const shortcutMobileToggle = document.getElementById('shortcut-mobile-toggle');
  const shortcutModalError = document.getElementById('shortcut-modal-error');
  const shortcutCancelButton = document.getElementById('shortcut-cancel-button');
  const shortcutSaveButton = document.getElementById('shortcut-save-button');

  let overlayAction = 'dismissOverlay';
  let overlayActionUrl = null;
  let launcherState = {
    currentUrl: '',
    canNavigateBack: false,
    canNavigateForward: false,
    isLaunching: false
  };
  let shortcuts = [];

  function parseInitialShortcuts() {
    if (!initialShortcutsElement || !initialShortcutsElement.textContent) {
      return [];
    }

    try {
      const parsed = JSON.parse(initialShortcutsElement.textContent);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
    overlayAction = 'dismissOverlay';
    overlayActionUrl = null;
  }

  function showOverlay(options) {
    overlayTitle.textContent = options.title || 'VSFeed';
    overlayMessage.textContent = options.message || '';
    overlayButton.textContent = options.buttonLabel || 'Dismiss';
    overlayAction = options.action || 'dismissOverlay';
    overlayActionUrl = options.url || null;
    overlay.classList.add('visible');
  }

  function normalizeUrl(url) {
    const trimmed = url.trim();
    if (!trimmed) {
      return '';
    }

    const hasProtocol = trimmed.indexOf('http://') === 0 || trimmed.indexOf('https://') === 0;
    return hasProtocol ? trimmed : 'https://' + trimmed;
  }

  function requestOpenUrl(url) {
    if (launcherState.isLaunching) {
      return;
    }

    urlInput.value = url;
    hideOverlay();
    launcherState.currentUrl = url;
    launcherState.isLaunching = true;
    updateControls();
    vscode.postMessage({
      type: 'openUrl',
      url: url
    });
  }

  function renderShortcuts(nextShortcuts) {
    shortcuts = nextShortcuts.slice();
    shortcutsContainer.textContent = '';

    shortcuts.forEach(function (shortcut) {
      if (!shortcut || !shortcut.name || !shortcut.url) {
        return;
      }

      const card = document.createElement('div');
      card.className = 'shortcut-card';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'shortcut-button';
      button.textContent = shortcut.name;
      button.title = 'Open ' + shortcut.name + ' in a new integrated-browser tab';
      button.disabled = launcherState.isLaunching;
      button.addEventListener('click', function () {
        requestOpenUrl(shortcut.url);
      });
      card.appendChild(button);

      if (shortcut.isRemovable && shortcut.id) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'shortcut-remove-button';
        removeButton.title = 'Remove ' + shortcut.name;
        removeButton.textContent = 'x';
        removeButton.addEventListener('click', function (event) {
          event.stopPropagation();
          vscode.postMessage({
            type: 'removeShortcut',
            shortcutId: shortcut.id
          });
        });
        card.appendChild(removeButton);
      }

      shortcutsContainer.appendChild(card);
    });
  }

  function clearShortcutModalError() {
    shortcutModalError.textContent = '';
  }

  function openShortcutModal(initialUrl) {
    const suggestedUrl = initialUrl || urlInput.value.trim() || launcherState.currentUrl || '';
    shortcutNameInput.value = '';
    shortcutUrlInput.value = suggestedUrl;
    shortcutMobileToggle.checked = true;
    clearShortcutModalError();
    shortcutModalBackdrop.classList.add('visible');
    setTimeout(function () {
      shortcutNameInput.focus();
    }, 0);
  }

  function closeShortcutModal() {
    shortcutModalBackdrop.classList.remove('visible');
    clearShortcutModalError();
  }

  function saveShortcutFromModal() {
    const name = shortcutNameInput.value.trim();
    const url = normalizeUrl(shortcutUrlInput.value);

    if (!name) {
      shortcutModalError.textContent = 'Enter a name for this quick-access item.';
      shortcutNameInput.focus();
      return;
    }

    if (!url) {
      shortcutModalError.textContent = 'Enter a URL to save.';
      shortcutUrlInput.focus();
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
    } catch {
      shortcutModalError.textContent = 'Enter a valid http or https URL.';
      shortcutUrlInput.focus();
      return;
    }

    closeShortcutModal();
    vscode.postMessage({
      type: 'saveShortcut',
      shortcut: {
        name: name,
        url: url,
        useMobileUrl: shortcutMobileToggle.checked
      }
    });
  }

  goButton.addEventListener('click', function () {
    if (launcherState.isLaunching) {
      return;
    }

    const url = normalizeUrl(urlInput.value);
    if (!url) {
      updateControls();
      return;
    }

    requestOpenUrl(url);
  });

  backButton.addEventListener('click', function () {
    if (backButton.disabled) {
      return;
    }

    launcherState.isLaunching = true;
    updateControls();
    vscode.postMessage({
      type: 'navigateBack'
    });
  });

  forwardButton.addEventListener('click', function () {
    if (forwardButton.disabled) {
      return;
    }

    launcherState.isLaunching = true;
    updateControls();
    vscode.postMessage({
      type: 'navigateForward'
    });
  });

  addShortcutButton.addEventListener('click', function () {
    openShortcutModal(normalizeUrl(urlInput.value));
  });

  shortcutCancelButton.addEventListener('click', function () {
    closeShortcutModal();
  });

  shortcutSaveButton.addEventListener('click', function () {
    saveShortcutFromModal();
  });

  shortcutModalBackdrop.addEventListener('click', function (event) {
    if (event.target === shortcutModalBackdrop) {
      closeShortcutModal();
    }
  });

  urlInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      goButton.click();
    }
  });

  urlInput.addEventListener('input', function () {
    updateControls();
  });

  shortcutNameInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveShortcutFromModal();
    }
  });

  shortcutUrlInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveShortcutFromModal();
    }
  });

  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && shortcutModalBackdrop.classList.contains('visible')) {
      closeShortcutModal();
    }
  });

  window.addEventListener('message', function (event) {
    const message = event.data || {};

    switch (message.type) {
      case 'navigate':
        launcherState.currentUrl = message.url || '';
        urlInput.value = launcherState.currentUrl;
        updateControls();
        break;

      case 'updateTimer':
        updateTimer(message.remaining);
        break;

      case 'showWarning':
        timerDisplay.classList.add('warning');
        break;

      case 'applyBlur':
        welcomeScreen.classList.add('blur-effect');
        break;

      case 'removeBlur':
        welcomeScreen.classList.remove('blur-effect');
        break;

      case 'showOverlay':
        showOverlay(message);
        break;

      case 'showAddShortcutModal':
        openShortcutModal(normalizeUrl(message.initialUrl || ''));
        break;

      case 'updateShortcuts':
        renderShortcuts(Array.isArray(message.shortcuts) ? message.shortcuts : []);
        updateControls();
        break;

      case 'updateNavigationState':
        launcherState.currentUrl = message.currentUrl || '';
        launcherState.canNavigateBack = Boolean(message.canNavigateBack);
        launcherState.canNavigateForward = Boolean(message.canNavigateForward);
        launcherState.isLaunching = Boolean(message.isLaunching);
        updateControls();
        break;

      case 'applyContentFilter':
        break;

      default:
        break;
    }
  });

  overlayButton.addEventListener('click', function () {
    const action = overlayAction;
    hideOverlay();

    if (action === 'resumeCoding' || action === 'openExternal') {
      vscode.postMessage({
        type: 'userAction',
        action: action,
        url: overlayActionUrl || undefined
      });
    }
  });

  function updateTimer(remaining) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerDisplay.textContent = minutes + ':' + String(seconds).padStart(2, '0');
    timerDisplay.classList.add('visible');
  }

  function updateControls() {
    const hasInput = Boolean(urlInput.value.trim());

    backButton.disabled = launcherState.isLaunching || !launcherState.canNavigateBack;
    forwardButton.disabled = launcherState.isLaunching || !launcherState.canNavigateForward;
    goButton.disabled = launcherState.isLaunching || !hasInput;
    addShortcutButton.disabled = launcherState.isLaunching;
    goButton.textContent = launcherState.isLaunching ? 'Opening...' : 'Go';

    shortcutsContainer.querySelectorAll('.shortcut-button').forEach(function (button) {
      button.disabled = launcherState.isLaunching;
    });

    if (launcherState.isLaunching) {
      launcherStatus.textContent = 'Opening a new integrated-browser tab...';
      return;
    }

    if (shortcuts.length > 0) {
      launcherStatus.textContent = 'Quick access stays inside VSFeed. Use + to save bookmarks and x to remove your own.';
      return;
    }

    launcherStatus.textContent = 'Use + to save bookmark-like quick access inside VSFeed.';
  }

  renderShortcuts(parseInitialShortcuts());
  updateControls();
}());
