// engine.js
// Core typing session engine: state, events, metrics, suggestion interface.
// Designed to be framework-agnostic so it can be plugged into React/Vue later.

export class TypingEngine {
  constructor({ onUpdate, onStats, onKey, onComplete, suggestionProvider, storage }) {
    this.onUpdate = onUpdate; // callback(textState)
    this.onStats = onStats;   // callback(stats)
    this.onKey = onKey;       // callback({key, correct, expected})
    this.onComplete = onComplete; // callback(sessionRecord)
    this.suggestionProvider = suggestionProvider;
    this.storage = storage;

    this.resetSession();
  }

  loadText(text) {
    this.testText = text.split('');
    this.cursor = 0;
    this.errors = 0;
    this.errorMap = {}; // key -> count
    this.timestamps = []; // for WPM; capture when each correct char typed
    this.sessionStart = performance.now();
    this.emitUpdate();
  }

  resetSession() {
    this.testText = [];
    this.cursor = 0;
    this.errors = 0;
    this.errorMap = {};
    this.timestamps = [];
    this.sessionStart = null;
    this.latencies = []; // intervals between correct characters
    this.latencyBuckets = {}; // histogram bucket -> count
    this.confusions = {}; // expected→typed error pairs
  }

  expectedChar() {
    return this.testText[this.cursor];
  }

  handleKey(key) {
    if (!this.testText.length) return;
    const expected = this.expectedChar();
    const correct = key === expected;
    const now = performance.now();
    const lastCorrectTs = this.timestamps.at(-1) ?? this.sessionStart;
    const interval = lastCorrectTs ? now - lastCorrectTs : 0;

    if (correct) {
      this.cursor++;
      this.timestamps.push(now);
      if (interval && interval < 5000) {
        this.latencies.push(interval);
        const bucket = Math.min(4000, Math.round(interval / 50) * 50);
        this.latencyBuckets[bucket] = (this.latencyBuckets[bucket] || 0) + 1;
      }
    } else {
      this.errors++;
      this.errorMap[expected] = (this.errorMap[expected] || 0) + 1;
      const pair = expected + '→' + key;
      this.confusions[pair] = (this.confusions[pair] || 0) + 1;
    }

    const finished = this.cursor >= this.testText.length;

    this.onKey?.({ key, correct, expected });
    this.emitUpdate();
    this.emitStats();

    if (finished) {
      this.persistSession();
    }
  }

  accuracy() {
    const typed = this.cursor + this.errors;
    if (!typed) return 100;
    return +Math.max(0, (this.cursor / typed) * 100).toFixed(1);
  }

  wpm() {
    if (!this.timestamps.length) return 0;
    const elapsedMs = (this.timestamps.at(-1) - this.sessionStart);
    const minutes = elapsedMs / 60000;
    const words = this.cursor / 5; // standard WPM measure
    return Math.round(words / minutes || 0);
  }

  emitUpdate() {
    const chars = this.testText.map((ch, i) => ({
      ch,
      status: i < this.cursor ? 'correct' : (i === this.cursor ? 'current' : 'pending')
    }));
    this.onUpdate?.({ chars, cursor: this.cursor, total: this.testText.length });
  }

  emitStats() {
    this.onStats?.({
      wpm: this.wpm(),
      accuracy: this.accuracy(),
      errors: this.errors,
      elapsed: this.elapsedSeconds(),
    });
  }

  elapsedSeconds() {
    if (!this.sessionStart) return 0;
    return Math.floor((performance.now() - this.sessionStart) / 1000);
  }

  persistSession() {
    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      length: this.testText.length,
      errors: this.errors,
      accuracy: parseFloat(this.accuracy()),
      wpm: this.wpm(),
      errorMap: this.errorMap,
      latency: this.latencySummary(),
      confusions: this.confusions
    };
    this.storage.saveSession(record);
    // Notify listeners (e.g., for high score or milestone detection)
    this.onComplete?.(record);
  }

  latencySummary() {
    if (!this.latencies.length) return null;
    const sorted = [...this.latencies].sort((a,b)=>a-b);
    const sum = sorted.reduce((a,b)=>a+b,0);
    const idx = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    return {
      count: sorted.length,
      avg: +(sum / sorted.length).toFixed(1),
      p50: +idx(0.5).toFixed(1),
      p90: +idx(0.9).toFixed(1),
      p99: +idx(0.99).toFixed(1)
    };
  }
}

// Simple localStorage wrapper (could replace with IndexedDB or remote API later)
export class LocalHistoryStorage {
  constructor(key = 'typeflow.history.v1') { this.key = key; }
  _load() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } }
  _save(list) { localStorage.setItem(this.key, JSON.stringify(list)); }
  saveSession(entry) { const list = this._load(); list.unshift(entry); this._save(list); }
  list(limit = 25) { return this._load().slice(0, limit); }
  clear() { this._save([]); }
  export() { return JSON.stringify(this._load(), null, 2); }
}

// Suggestion engine: analyze aggregated error history across sessions and current session
export function generateSuggestions({ historySessions, currentErrorMap, max = 8 }) {
  const aggregate = new Map();
  const consider = [...historySessions];
  consider.forEach(s => {
    Object.entries(s.errorMap || {}).forEach(([char, count]) => {
      aggregate.set(char, (aggregate.get(char) || 0) + count);
    });
  });
  Object.entries(currentErrorMap || {}).forEach(([char, count]) => {
    aggregate.set(char, (aggregate.get(char) || 0) + count * 1.2); // weight current session slightly higher
  });
  const scored = [...aggregate.entries()].map(([char, count]) => {
    const isWhitespace = /\s/.test(char);
    const rarityBoost = isWhitespace ? 0.4 : 1; // whitespace slightly deprioritized
    return [char, count * rarityBoost];
  });
  scored.sort((a,b)=> b[1]-a[1]);
  return scored.slice(0,max).map(([char, score]) => ({ char, score }));
}
