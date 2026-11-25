(function () {
  'use strict';
  const vscode = acquireVsCodeApi();
  const $ = id => document.getElementById(id);
  const send = message => vscode.postMessage(message);
  const saved = vscode.getState() || {};
  let view = ['home', 'library', 'history', 'settings'].includes(saved.view) ? saved.view : 'home';
  let group = 'All';
  let shortcuts = [];
  let history = [];
  let preferences = { groups: {}, pinned: [] };
  let launching = false;
  let active = false;
  let overlayAction = 'dismissOverlay';
  let query = '';
  let returnFocus;
  let editingId;
  const icons = [
    ['reddit.com', '●', '#f4501e'], ['x.com', '𝕏', '#171717'], ['twitter.com', '𝕏', '#171717'],
    ['youtube.com', '▶', '#e62117'], ['instagram.com', '◎', '#b43886'],
    ['ycombinator.com', 'Y', '#ec771c'], ['github.com', '⌘', '#555c68']
  ];
  const directory = {
    Dev: [
      ['GitHub', 'https://github.com'],
      ['MDN Web Docs', 'https://developer.mozilla.org'],
      ['Stack Overflow', 'https://stackoverflow.com'],
      ['npm', 'https://www.npmjs.com'],
      ['PyPI', 'https://pypi.org']
    ],
    Reading: [
      ['Wikipedia', 'https://www.wikipedia.org'],
      ['arXiv', 'https://arxiv.org'],
      ['Lobsters', 'https://lobste.rs'],
      ['Project Gutenberg', 'https://www.gutenberg.org']
    ],
    Social: [
      ['LinkedIn', 'https://www.linkedin.com'],
      ['Bluesky', 'https://bsky.app'],
      ['Twitch', 'https://www.twitch.tv'],
      ['Discord', 'https://discord.com/app']
    ]
  };

  function siteKey(value) {
    const url = new URL(value);
    return host(value) + (url.pathname.replace(/\/$/, '')) + url.search + url.hash;
  }

  function host(url) { try { return new URL(url).hostname.replace(/^(www\.|m\.|mobile\.)/, ''); } catch { return ''; } }
  function icon(url) {
    const domain = host(url);
    const match = icons.find(item => domain === item[0] || domain.endsWith('.' + item[0]));
    const node = document.createElement('span'); node.className = 'site-icon'; node.setAttribute('aria-hidden', 'true');
    node.textContent = match ? match[1] : (domain[0] || '↗').toUpperCase();
    if (match) { node.style.setProperty('--icon-color', match[2]); }
    const drawings = {
      'youtube.com': [['path', { d: 'M9 7l8 5-8 5z', fill: 'white', stroke: 'none' }]],
      'instagram.com': [['rect', { x: 4, y: 4, width: 16, height: 16, rx: 5 }], ['circle', { cx: 12, cy: 12, r: 4 }], ['circle', { cx: 17, cy: 7, r: 1, fill: 'white', stroke: 'none' }]],
      'reddit.com': [['ellipse', { cx: 12, cy: 14, rx: 8, ry: 6 }], ['path', { d: 'M12 8l2-5 5 1M8 16q4 3 8 0' }], ['circle', { cx: 9, cy: 12, r: 1, fill: 'white' }], ['circle', { cx: 15, cy: 12, r: 1, fill: 'white' }], ['circle', { cx: 20, cy: 4, r: 2 }]]
    };
    if (match && drawings[match[0]]) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '24'); svg.setAttribute('height', '24');
      svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'white'); svg.setAttribute('stroke-width', '1.6');
      drawings[match[0]].forEach(([tag, attrs]) => {
        const shape = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => shape.setAttribute(key, String(value))); svg.append(shape);
      });
      node.replaceChildren(svg);
    }
    return node;
  }
  function button(label, action, className) {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label;
    if (className) { node.className = className; } node.addEventListener('click', action); return node;
  }
  function empty(container, title, detail) {
    const node = document.createElement('div'); node.className = 'empty';
    const strong = document.createElement('strong'); strong.textContent = title;
    node.append(strong, document.createTextNode(detail)); container.append(node);
  }
  function collection(site) {
    if (preferences.groups[site.url]) { return preferences.groups[site.url]; }
    const domain = host(site.url);
    const suggested = Object.entries(directory).find(([, sites]) => sites.some(([, url]) => host(url) === domain));
    if (suggested) { return suggested[0]; }
    return /(^|\.)(github\.com|ycombinator\.com|stackoverflow\.com)$/.test(domain) ? 'Dev' :
      /(^|\.)(reddit\.com|instagram\.com|x\.com|twitter\.com|youtube\.com)$/.test(domain) ? 'Social' : 'Reading';
  }
  function matches(site) { return (site.name + ' ' + site.url).toLowerCase().includes(query.toLowerCase()); }
  function persistPreferences() { send({ type: 'savePreferences', preferences }); }
  function openUrl(url) {
    if (launching) { return; }
    launching = true; updateBusy(); send({ type: 'openUrl', url });
  }
  function normalize(value) {
    const trimmed = value.trim();
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : 'https://' + trimmed);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) { throw new Error('Enter an http or https URL.'); }
    return url.href;
  }
  function setView(next) {
    view = next;
    document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== 'view-' + view; });
    document.querySelectorAll('[data-view]').forEach(node => {
      const selected = node.dataset.view === view; node.classList.toggle('active', selected);
      if (selected) { node.setAttribute('aria-current', 'page'); } else { node.removeAttribute('aria-current'); }
    });
    $('search-section').hidden = view === 'settings';
    $('url-input').placeholder = view === 'history' ? 'Search launch history' : 'Search saved sites or enter a URL';
    vscode.setState({ view }); render();
  }
  function renderSites() {
    const container = $('shortcuts-container'); container.replaceChildren();
    const filtered = shortcuts.filter(site => matches(site) && (group === 'All' || collection(site) === group))
      .sort((a, b) => Number(preferences.pinned.includes(b.url)) - Number(preferences.pinned.includes(a.url)));
    filtered.forEach(site => {
      const card = document.createElement('div'); card.className = 'site-card';
      const node = button('', () => openUrl(site.url), 'site-button'); node.disabled = launching; node.title = 'Open ' + site.name;
      const name = document.createElement('span'); name.className = 'site-name'; name.textContent = site.name;
      node.append(icon(site.url), name); card.append(node); container.append(card);
    });
    const add = button('', () => openModal(), 'add-site');
    const plus = document.createElement('span'); plus.textContent = '+';
    const label = document.createElement('span'); label.textContent = 'Add site'; add.append(plus, label); container.append(add);
    if (!filtered.length) { empty(container, 'No matching sites', 'Try another search or add a site.'); }
    const chips = $('groups'); chips.replaceChildren();
    ['All', 'Social', 'Dev', 'Reading'].forEach(name => {
      const chip = button(name, () => { group = name; renderSites(); }, 'chip' + (group === name ? ' selected' : ''));
      chip.setAttribute('aria-pressed', String(group === name)); chips.append(chip);
    });
  }
  function renderLibrary() {
    const list = $('library-list'); list.replaceChildren();
    shortcuts.filter(matches).forEach(site => {
      const row = document.createElement('div'); row.className = 'row library-row';
      const main = document.createElement('div'); main.className = 'row-main';
      const link = button(site.name, () => openUrl(site.url), 'row-link'); link.disabled = launching;
      const domain = document.createElement('small'); domain.textContent = host(site.url); main.append(link, domain);
      const actions = document.createElement('div'); actions.className = 'row-actions';
      const pinned = preferences.pinned.includes(site.url);
      const pin = button(pinned ? '★ Pinned' : '☆ Pin', () => {
        preferences.pinned = pinned ? preferences.pinned.filter(url => url !== site.url) : [...preferences.pinned, site.url];
        persistPreferences(); render();
      }); pin.setAttribute('aria-pressed', String(pinned));
      const select = document.createElement('select'); select.setAttribute('aria-label', 'Collection for ' + site.name);
      ['Social', 'Dev', 'Reading'].forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; select.append(option); });
      select.value = collection(site); select.addEventListener('change', () => { preferences.groups[site.url] = select.value; persistPreferences(); renderSites(); });
      actions.append(pin, select);
      if (site.isRemovable && site.id) {
        actions.append(button('Edit', () => openModal(site.savedUrl || site.url, site)));
        actions.append(button('Remove', () => send({ type: 'removeShortcut', shortcutId: site.id })));
      } else {
        const edit = button('Edit', () => send({ type: 'openSettings', section: 'vsfeed' })); edit.title = 'Edit configured sites in VSFeed settings'; actions.append(edit);
      }
      row.append(icon(site.url), main, actions); list.append(row);
    });
    if (!list.childElementCount) { empty(list, 'Your sites live here', 'Add a site or change your search.'); }
  }
  function renderDirectory() {
    const list = $('directory-list');
    list.replaceChildren();
    const saved = new Set(shortcuts.flatMap(site => {
      try { return [siteKey(site.savedUrl || site.url)]; } catch { return []; }
    }));
    for (const [category, entries] of Object.entries(directory)) {
      const sites = entries.filter(([name, url]) => matches({ name, url }));
      if (!sites.length) { continue; }
      const heading = document.createElement('h2');
      heading.className = 'directory-heading';
      heading.textContent = category;
      list.append(heading);
      for (const [name, url] of sites) {
        const row = document.createElement('div');
        row.className = 'row';
        const main = document.createElement('div');
        main.className = 'row-main';
        const open = button(name, () => openUrl(url), 'row-link');
        open.disabled = launching;
        const domain = document.createElement('small');
        domain.textContent = host(url);
        main.append(open, domain);
        const added = saved.has(siteKey(url));
        const add = button(added ? 'Saved' : '+ Save', () => {
          add.disabled = true;
          send({ type: 'saveShortcut', shortcut: { name, url, useMobileUrl: false } });
        });
        add.disabled = added;
        add.setAttribute('aria-label', added ? name + ' is saved' : 'Save ' + name);
        row.append(icon(url), main, add);
        list.append(row);
      }
    }
    if (!list.childElementCount) {
      empty(list, 'No matching sites', 'Try another search or add a custom URL.');
    }
  }

  function renderHistory(id, recent) {
    const list = $(id); list.replaceChildren();
    let entries = history.filter(entry => entry.url.toLowerCase().includes(query.toLowerCase()));
    if (recent) { entries = entries.slice(0, 4); }
    entries.forEach(entry => {
      const row = document.createElement('div'); row.className = 'row';
      const main = document.createElement('div'); main.className = 'row-main';
      const site = shortcuts.find(item => host(item.url) === host(entry.url));
      const link = button(site ? site.name : host(entry.url), () => openUrl(entry.url), 'row-link'); link.title = entry.url; link.disabled = launching;
      const time = document.createElement('small'); time.textContent = new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      main.append(link, time); row.append(icon(entry.url), main);
      const actions = document.createElement('div'); actions.className = 'row-actions';
      const open = button('↗', () => openUrl(entry.url)); open.setAttribute('aria-label', 'Reopen ' + host(entry.url)); open.disabled = launching; actions.append(open);
      if (!recent) { const remove = button('×', () => send({ type: 'deleteHistory', timestamp: entry.timestamp })); remove.setAttribute('aria-label', 'Remove launch of ' + host(entry.url)); actions.append(remove); }
      row.append(actions); list.append(row);
    });
    if (!list.childElementCount) { empty(list, query ? 'No matching launches' : 'Your next break starts here', query ? 'Try another search.' : 'Open a site and it will appear here.'); }
    $('clear-history').disabled = !history.length;
  }
  function render() { renderSites(); renderLibrary(); renderDirectory(); renderHistory('recent-list', true); renderHistory('history-list', false); }
  function updateBusy() {
    $('go-button').disabled = launching;
    $('launcher-status').textContent = launching ? 'Opening in integrated browser…' : '';
    render();
  }
  function openModal(initialUrl, site) {
    editingId = site && site.id;
    $('shortcut-modal-title').textContent = site ? 'Edit site' : 'Add a site';
    returnFocus = document.activeElement;
    $('shortcut-name-input').value = site ? site.name : ''; $('shortcut-url-input').value = initialUrl || '';
    $('shortcut-mobile-toggle').checked = !!(site && site.useMobileUrl); $('shortcut-modal-error').textContent = '';
    if (!$('shortcut-modal-backdrop').open) { $('shortcut-modal-backdrop').showModal(); }
    $('shortcut-name-input').focus();
  }
  $('shortcut-cancel-button').addEventListener('click', () => $('shortcut-modal-backdrop').close());
  $('shortcut-modal-backdrop').addEventListener('close', () => { if (returnFocus) { returnFocus.focus(); } });
  $('shortcut-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const name = $('shortcut-name-input').value.trim();
      if (!name) { throw new Error('Enter a name for this site.'); }
      const url = normalize($('shortcut-url-input').value);
      send({ type: 'saveShortcut', shortcutId: editingId, shortcut: { name, url, useMobileUrl: $('shortcut-mobile-toggle').checked } });
      $('shortcut-modal-backdrop').close();
    } catch (error) { $('shortcut-modal-error').textContent = error.message; }
  });
  $('search-form').addEventListener('submit', event => {
    event.preventDefault();
    if (view === 'history' || !query.trim()) { return; }
    const exact = shortcuts.find(site => site.name.toLowerCase() === query.trim().toLowerCase());
    const filtered = shortcuts.filter(matches);
    if (exact) { openUrl(exact.url); return; }
    if (filtered.length === 1 && !query.includes('.')) { openUrl(filtered[0].url); return; }
    try { openUrl(normalize(query)); } catch (error) { $('launcher-status').textContent = error.message; }
  });
  $('url-input').addEventListener('input', () => { query = $('url-input').value; if (view === 'library' && query.trim()) { $('site-directory').open = true; } render(); });
  document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => setView(node.dataset.view)));
  document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); setView('home'); });
  $('edit-shortcuts').addEventListener('click', () => setView('library'));
  $('library-add').addEventListener('click', () => openModal());
  $('view-all-history').addEventListener('click', () => setView('history'));
  $('settings-history').addEventListener('click', () => setView('history'));
  $('clear-history').addEventListener('click', () => {
    overlayAction = 'clearHistory'; $('overlay-title').textContent = 'Clear launch history?';
    $('overlay-message').textContent = 'This removes VSFeed’s saved launches. Browser history and cookies stay unchanged.';
    $('overlay-button').textContent = 'Clear history'; $('overlay').showModal();
  });
  $('extension-settings').addEventListener('click', () => send({ type: 'openSettings', section: 'vsfeed' }));
  $('browser-settings').addEventListener('click', () => send({ type: 'openSettings', section: 'browser' }));
  const breakPreset = $('break-duration');
  const customDuration = $('custom-break-duration');
  breakPreset.addEventListener('change', () => {
    customDuration.hidden = breakPreset.value !== 'custom';
    if (!customDuration.hidden) { customDuration.focus(); }
  });
  $('start-break').addEventListener('click', () => {
    if (active) { send({ type: 'stopBreak' }); return; }
    if (breakPreset.value === 'custom' && !customDuration.reportValidity()) { return; }
    const minutes = breakPreset.value === 'custom' ? customDuration.valueAsNumber : Number(breakPreset.value);
    send({ type: 'startBreak', minutes });
  });
  customDuration.addEventListener('keydown', event => {
    if (event.key === 'Enter') { $('start-break').click(); }
  });
  $('back-button').addEventListener('click', () => send({ type: 'navigateBack' }));
  $('forward-button').addEventListener('click', () => send({ type: 'navigateForward' }));
  $('overlay-button').addEventListener('click', () => {
    $('overlay').close();
    if (overlayAction === 'clearHistory') { send({ type: 'clearHistory' }); }
    else if (overlayAction === 'resumeCoding') { send({ type: 'userAction', action: 'resumeCoding' }); }
  });
  function session(isActive, remaining) {
    active = isActive; $('start-break').textContent = active ? 'End break' : '▶ Start break';
    breakPreset.hidden = active;
    customDuration.hidden = active || breakPreset.value !== 'custom';
    $('timer-display').textContent = active ? Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0') : '';
    if (!active) { $('timer-display').classList.remove('warning'); }
  }
  window.addEventListener('message', event => {
    const message = event.data || {};
    switch (message.type) {
      case 'updateShortcuts': shortcuts = message.shortcuts || []; render(); break;
      case 'dashboardState': history = message.history; preferences = message.preferences; render(); break;
      case 'sessionState': session(message.active, message.remaining); break;
      case 'updateTimer': session(true, message.remaining); break;
      case 'updateNavigationState':
        launching = !!message.isLaunching;
        $('back-button').disabled = launching || !message.canNavigateBack;
        $('forward-button').disabled = launching || !message.canNavigateForward; updateBusy(); break;
      case 'showWarning': $('timer-display').classList.add('warning'); break;
      case 'applyBlur': $('welcome-screen').classList.add('blur-effect'); session(false, 0); break;
      case 'removeBlur': $('welcome-screen').classList.remove('blur-effect'); break;
      case 'showAddShortcutModal': openModal(message.initialUrl); break;
      case 'showOverlay':
        overlayAction = message.action || 'dismissOverlay'; $('overlay-title').textContent = message.title || 'VSFeed';
        $('overlay-message').textContent = message.message; $('overlay-button').textContent = message.buttonLabel || 'Dismiss';
        if (!$('overlay').open) { $('overlay').showModal(); } break;
    }
  });
  try { shortcuts = JSON.parse($('vsfeed-shortcuts-data').textContent); } catch { shortcuts = []; }
  $('back-button').disabled = true; $('forward-button').disabled = true;
  setView(view); send({ type: 'ready' });
}());
