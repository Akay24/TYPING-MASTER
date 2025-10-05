// app.js
// Entry module: wires DOM <-> TypingEngine. Minimal vanilla structure
// Easily swappable with React/Vue later (engine stays the same).

import { TypingEngine, LocalHistoryStorage, generateSuggestions } from './engine.js';
import { initParticles } from './particles.js';

// --- DOM references ---
const els = {
  testText: document.getElementById('testText'),
  keyStream: document.getElementById('keyStream'),
  suggestions: document.getElementById('suggestions'),
  statTime: document.getElementById('statTime'),
  statWPM: document.getElementById('statWPM'),
  statAccuracy: document.getElementById('statAccuracy'),
  statErrors: document.getElementById('statErrors'),
  historyList: document.getElementById('historyList'),
  modeToggle: document.getElementById('modeToggle'),
  regenSuggestions: document.getElementById('regenSuggestions'),
  startDrill: document.getElementById('startDrill'),
  endDrill: document.getElementById('endDrill'),
  exportHistory: document.getElementById('exportHistory'),
  clearHistory: document.getElementById('clearHistory'),
  resetSession: document.getElementById('resetSession'),
  helpDialog: document.getElementById('helpDialog'),
  showHelp: document.getElementById('showHelp'),
  authOpen: document.getElementById('authOpen'),
  authDialog: document.getElementById('authDialog'),
  authForm: document.getElementById('authForm'),
  authModeSwitch: document.getElementById('authModeSwitch'),
  authCancel: document.getElementById('authCancel'),
  authTitle: document.getElementById('authTitle'),
  authSubmit: document.getElementById('authSubmit'),
  authExtra: document.getElementById('authExtra'),
  authMessage: document.getElementById('authMessage'),
  userStatus: document.getElementById('userStatus'),
  keyboard: document.getElementById('keyboard'),
  toastContainer: document.getElementById('toastContainer')
};

// --- Storage & engine setup ---
const storage = new LocalHistoryStorage();

const engine = new TypingEngine({
  onUpdate: renderText,
  onStats: updateStats,
  onKey: visualizeKey,
  onComplete: handleSessionComplete,
  suggestionProvider: () => {},
  storage
});

// --- Auth State ---
let authState = {
  user: null, // {username}
  token: null,
  mode: 'login' // or 'signup'
};

function loadAuthFromStorage() {
  try {
    const raw = localStorage.getItem('typeflow.auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      authState = { ...authState, ...parsed };
      if (authState.user) updateUserStatus();
    }
  } catch {}
}

function persistAuth() {
  localStorage.setItem('typeflow.auth', JSON.stringify({ user: authState.user, token: authState.token }));
}

function updateUserStatus() {
  els.userStatus.textContent = authState.user ? `(${authState.user.username})` : '(guest)';
}

function logout() {
  authState.user = null;
  authState.token = null;
  persistAuth();
  updateUserStatus();
  pushToast({ title: 'Logged out', body: 'You are now in guest mode.', type: 'success' });
}

// --- Mock API ---
async function mockApi(path, payload) {
  // Simulate network+auth; replace with real fetch in real backend integration
  await new Promise(r => setTimeout(r, 400));
  if (path === '/api/login') {
    if (payload.username && payload.password) {
      return { token: 'jwt.mock.' + btoa(payload.username), user: { username: payload.username } };
    }
    throw new Error('Invalid credentials');
  }
  if (path === '/api/signup') {
    if (payload.password !== payload.password2) throw new Error('Passwords do not match');
    return { token: 'jwt.mock.' + btoa(payload.username), user: { username: payload.username } };
  }
  if (path === '/api/session') {
    // Accept posted session data; pretend stored server-side (noop)
    if (!authState.token) throw new Error('Unauthorized');
    return { ok: true };
  }
  throw new Error('Unknown endpoint');
}

async function syncLatestSessionToServer(record) {
  if (!authState.token) return; // only sync if logged in
  try { await mockApi('/api/session', { record, token: authState.token }); }
  catch (e) { console.warn('Sync failed (mock):', e.message); }
}

// Provide initial practice text
const sampleTexts = [
  'The quick brown fox jumps over the lazy dog.',
  'TypeFlow adaptive engine tracks your weak keys.',
  'Practice makes perfect. Smooth consistent motion.',
  'Refine accuracy first—speed follows naturally.'
];

function randomText() { return sampleTexts[Math.floor(Math.random() * sampleTexts.length)]; }
engine.loadText(randomText());

// --- Key handling ---
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    const keyChar = e.key === 'Enter' ? '\n' : (e.key === 'Tab' ? '\t' : e.key);
    engine.handleKey(keyChar);
    scheduleSuggestionRefresh();
  } else if (e.key === 'Escape') {
    engine.loadText(randomText());
    clearKeyStream();
    refreshSuggestions();
  }
});

// --- Render functions ---
function renderText(state) {
  els.testText.innerHTML = state.chars.map((c, i) => {
    const classes = [c.status];
    return `<span class="${classes.join(' ')}">${escapeHTML(c.ch)}</span>`;
  }).join('');
}

function visualizeKey({ key, correct, expected }) {
  const chip = document.createElement('span');
  chip.className = 'key-chip ' + (correct ? 'good' : 'bad');
  chip.textContent = printable(key);
  chip.title = correct ? '✓' : `Expected: ${printable(expected)}`;
  els.keyStream.prepend(chip);
  // limit stream size
  if (els.keyStream.children.length > 40) {
    els.keyStream.removeChild(els.keyStream.lastChild);
  }
  flashKeyboardKey(key, correct);
}

function clearKeyStream() { els.keyStream.innerHTML = ''; }

function updateStats({ wpm, accuracy, errors, elapsed }) {
  els.statWPM.textContent = wpm;
  els.statAccuracy.textContent = accuracy + '%';
  els.statErrors.textContent = errors;
  els.statTime.textContent = elapsed + 's';
  const sr = document.getElementById('srStats');
  if (sr) sr.textContent = `Time ${elapsed} seconds, WPM ${wpm}, accuracy ${accuracy} percent, errors ${errors}`;
  renderHistory();
}

// --- Suggestions ---
let suggestionRefreshTimer;
function scheduleSuggestionRefresh() {
  clearTimeout(suggestionRefreshTimer);
  suggestionRefreshTimer = setTimeout(refreshSuggestions, 550);
}

function refreshSuggestions() {
  const historySessions = storage.list(60);
  const suggestions = generateSuggestions({
    historySessions,
    currentErrorMap: engine.errorMap,
    max: 10
  });
  els.suggestions.innerHTML = suggestions.map(s => `<li data-char="${escapeHTML(s.char)}" title="score ${s.score}">${printable(s.char)}</li>`).join('');
}

// Example of turning a suggestion into a micro-drill sequence you could load later
function buildDrillFromSuggestions() {
  const chars = [...els.suggestions.querySelectorAll('li')].map(li => li.getAttribute('data-char'));
  if (!chars.length) return null;
  // simple pattern: repeat each key 4 times separated by space
  return chars.map(c => c.repeat(4)).join(' ');
}

// --- Drill Mode ---
let drillActive = false;
let previousText = null;
function startDrill() {
  if (drillActive) return;
  const drill = buildDrillFromSuggestions();
  if (!drill) { pushToast({ title: 'No suggestions', body: 'Type a bit more first.', type: 'error' }); return; }
  previousText = engine.testText.join('');
  engine.loadText(drill);
  clearKeyStream();
  drillActive = true;
  els.startDrill.style.display = 'none';
  els.endDrill.style.display = 'inline-flex';
  pushToast({ title: 'Drill started', body: 'Focused repetition loaded.', type: 'success' });
}

function endDrill() {
  if (!drillActive) return;
  engine.loadText(previousText || randomText());
  drillActive = false;
  els.endDrill.style.display = 'none';
  els.startDrill.style.display = 'inline-flex';
  pushToast({ title: 'Drill ended', body: 'Returning to normal practice.', type: 'info' });
  refreshSuggestions();
}

// --- Milestone / High Score Detection ---
function bestHistoryMetric(metric) {
  return storage.list(200).reduce((best, s) => Math.max(best, s[metric] ?? 0), 0);
}

function averageWeakErrorReduction(currentRecord) {
  // naive: compare sum of current errorMap vs average of last 5 sessions
  const past = storage.list(6).slice(1); // exclude latest just added
  if (!past.length) return 0;
  const pastAvgErrors = past.reduce((a,s)=>a + Object.values(s.errorMap||{}).reduce((x,y)=>x+y,0),0)/past.length;
  const currentErrors = Object.values(currentRecord.errorMap||{}).reduce((a,b)=>a+b,0);
  if (!pastAvgErrors) return 0;
  return ((pastAvgErrors - currentErrors)/pastAvgErrors)*100;
}

function handleSessionComplete(record) {
  // re-run suggestions to reflect improvements
  refreshSuggestions();
  const bestBefore = storage.list(200).slice(1).reduce((m,s)=>Math.max(m,s.wpm||0),0); // exclude current (most recent stored first)
  if (record.wpm > bestBefore) {
    pushToast({ title: 'New Personal Best!', body: `${record.wpm} WPM`, type: 'success' });
    els.statWPM.classList.add('milestone-glow');
    setTimeout(()=>els.statWPM.classList.remove('milestone-glow'), 2400);
  }
  // high accuracy threshold
  if (record.accuracy >= 98) {
    pushToast({ title: 'Precision Master', body: `${record.accuracy}% accuracy`, type: 'success' });
  }
  // improvement in weak keys
  const reduction = averageWeakErrorReduction(record);
  if (reduction >= 25) {
    pushToast({ title: 'Great Improvement', body: `Errors down ${reduction.toFixed(1)}% vs recent avg`, type: 'success' });
  }
}

// --- History ---
function renderHistory() {
  const sessions = storage.list(12);
  els.historyList.innerHTML = sessions.map(s => {
    return `<li><span>${new Date(s.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span><span>${s.wpm} wpm</span><span>${s.accuracy}%</span><span>${s.errors} errs</span></li>`;
  }).join('');
}

// --- Keyboard Visualization ---
const KEY_LAYOUT = [
  ['Escape','1','2','3','4','5','6','7','8','9','0','-','=', 'Backspace'],
  ['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
  ['CapsLock','A','S','D','F','G','H','J','K','L',';','\'','Enter'],
  ['ShiftLeft','Z','X','C','V','B','N','M',',','.','/','ShiftRight'],
  ['ControlLeft','MetaLeft','AltLeft','Space','AltRight','MetaRight','ContextMenu','ControlRight']
];

const codeToElement = new Map();
function buildKeyboard() {
  if (!els.keyboard) return;
  KEY_LAYOUT.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';
    row.forEach(code => {
      const keyEl = document.createElement('div');
      keyEl.className = 'k-key';
      keyEl.dataset.code = code;
      keyEl.textContent = keyLabel(code);
      rowEl.appendChild(keyEl);
      codeToElement.set(code.toLowerCase(), keyEl);
    });
    els.keyboard.appendChild(rowEl);
  });
}

function keyLabel(code) {
  if (code === 'MetaLeft' || code === 'MetaRight') return 'Meta';
  if (code === 'ContextMenu') return 'Menu';
  if (code.startsWith('Shift')) return 'Shift';
  if (code.startsWith('Control')) return 'Ctrl';
  if (code.startsWith('Alt')) return 'Alt';
  if (code === 'Space') return 'Space';
  return code.length === 1 ? code : code.replace('Left','').replace('Right','');
}

function flashKeyboardKey(keyRaw, correct) {
  // Attempt mapping by event.key and event.code heuristics
  const key = keyRaw.length === 1 ? keyRaw.toLowerCase() : keyRaw.toLowerCase();
  let el = codeToElement.get(key);
  if (!el) {
    // fallback for special names
    const alt = {
      '\n': 'enter', '\t': 'tab', ' ': 'space'
    }[key];
    if (alt) el = codeToElement.get(alt);
  }
  if (!el) return;
  el.classList.remove('good','bad');
  void el.offsetWidth; // force reflow
  el.classList.add(correct ? 'good' : 'bad');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 180);
}

// --- Toast Notifications ---
function pushToast({ title, body, type = 'info', timeout = 4000 }) {
  const wrap = document.createElement('div');
  wrap.className = 'toast ' + (type === 'error' ? 'error' : (type === 'success' ? 'success' : ''));
  wrap.innerHTML = `<div><div class="title">${escapeHTML(title)}</div><div class="body">${escapeHTML(body)}</div></div><button class="close" aria-label="Close">✕</button>`;
  els.toastContainer.appendChild(wrap);
  const remove = () => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); };
  wrap.querySelector('.close').addEventListener('click', remove);
  if (timeout) setTimeout(remove, timeout);
}

// --- Auth UI Handlers ---
els.authOpen.addEventListener('click', () => {
  if (authState.user) {
    if (confirm('Logout current user?')) logout();
    return;
  }
  openAuthDialog('login');
});

els.authCancel.addEventListener('click', () => els.authDialog.close());
els.authModeSwitch.addEventListener('click', () => {
  const next = authState.mode === 'login' ? 'signup' : 'login';
  openAuthDialog(next);
});

function openAuthDialog(mode) {
  authState.mode = mode;
  els.authTitle.textContent = mode === 'login' ? 'Login' : 'Create Account';
  els.authSubmit.textContent = mode === 'login' ? 'Login' : 'Sign Up';
  els.authModeSwitch.textContent = mode === 'login' ? 'Need an account?' : 'Have an account?';
  els.authExtra.style.display = mode === 'signup' ? 'block' : 'none';
  els.authMessage.textContent = '';
  els.authDialog.showModal();
}

els.authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(els.authForm);
  const username = fd.get('username').trim();
  const password = fd.get('password');
  const password2 = fd.get('password2');
  try {
    els.authSubmit.disabled = true;
    const path = authState.mode === 'login' ? '/api/login' : '/api/signup';
    const result = await mockApi(path, { username, password, password2 });
    authState.user = result.user;
    authState.token = result.token;
    persistAuth();
    updateUserStatus();
    pushToast({ title: authState.mode === 'login' ? 'Welcome back' : 'Account created', body: username, type: 'success' });
    els.authDialog.close();
  } catch (err) {
    els.authMessage.textContent = err.message;
    pushToast({ title: 'Auth failed', body: err.message, type: 'error' });
  } finally {
    els.authSubmit.disabled = false;
  }
});

// --- Utilities ---
function escapeHTML(str) { return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function printable(k) {
  if (k === '\n') return '⏎';
  if (k === '\t') return '⇥';
  if (k === ' ') return '␣';
  return k;
}

// --- Theme toggle ---
els.modeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('typeflow.theme', next);
});

(function initTheme() {
  const saved = localStorage.getItem('typeflow.theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// --- Buttons wiring ---
els.regenSuggestions.addEventListener('click', refreshSuggestions);
els.startDrill.addEventListener('click', startDrill);
els.endDrill.addEventListener('click', endDrill);
els.exportHistory.addEventListener('click', () => {
  const blob = new Blob([storage.export()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'typeflow-history.json';
  a.click();
});
els.clearHistory.addEventListener('click', () => {
  if (confirm('Clear all local history?')) { storage.clear(); renderHistory(); refreshSuggestions(); }
});
els.resetSession.addEventListener('click', () => {
  engine.loadText(randomText());
  clearKeyStream();
  refreshSuggestions();
});

els.showHelp.addEventListener('click', (e) => { e.preventDefault(); els.helpDialog.showModal(); });

// --- Initialize ---
refreshSuggestions();
renderHistory();
initParticles();
buildKeyboard();
loadAuthFromStorage();
updateUserStatus();

// Example extension hook: after N seconds, optionally propose a drill
setInterval(() => {
  if (engine.elapsedSeconds() > 45 && engine.cursor < engine.testText.length / 2) {
    // you could show a UI nudge to switch to a drill text
    // console.debug('Consider switching to drill based on suggestions');
  }
}, 8000);

// Expose for console experimentation
window.typeflow = { engine, storage, buildDrillFromSuggestions };
