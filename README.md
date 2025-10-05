# TypeFlow (Prototype)

Adaptive, neon-styled typing trainer inspired by Monkeytype minimal focus + cyberpunk accents.

## Features Implemented
- Real-time typing feedback (correct/error highlighting, animated key chips)
- WPM & accuracy tracking (standard 5-char word metric)
- Latency tracking (per correct character intervals; stored summary in session record)
- Error pattern detection (per-character error map, confusion pairs expected→typed)
- Adaptive suggestions (ranks weak characters from cumulative history + current session weighting)
- Drill mode (generate focused repetition pattern from current suggestions)
- Visual keyboard (highlights correctness; supports common desktop layout)
- Session history (localStorage, export & clear; stores latency summary + confusions)
- Mock authentication (login / signup modal; local persistence; easily swappable for real API)
- Toast notification system (success/error/info) with neon glow states
- Theme toggle (dark/light) persistent
- Service Worker (offline shell caching)
- Particle background (tsParticles) encapsulated in `particles.js`
- Fully modular engine (`TypingEngine`) decoupled from UI for future React/Vue migration

## File Structure
```
index.html
styles/
  base.css        # foundational variables / earlier styles
  style.css       # neon cyberpunk design layer
src/
  app.js          # DOM integration, auth, UI logic, drill mode, toasts
  engine.js       # core typing engine + suggestion engine + history storage
  particles.js    # tsParticles integration stub
sw.js             # offline caching service worker
server.js         # example Express + JWT backend (optional)
README.md
```

## Typing Engine Data
Each completed session persisted as:
```jsonc
{
  "id": 1735934020000,
  "timestamp": "2025-10-03T12:00:00.000Z",
  "length": 57,
  "errors": 4,
  "accuracy": 93.8,
  "wpm": 72,
  "errorMap": { "e": 2, "t": 1, " ": 1 },
  "latency": { "count": 56, "avg": 245.1, "p50": 210.0, "p90": 410.0, "p99": 690.0 },
  "confusions": { "e→r": 1, "t→y": 1 }
}
```

## Drill Mode Logic
1. Generate suggestions (top weak characters)
2. Build pattern: each character repeated 4× separated by spaces
3. Replace active test text with drill; show End Drill button
4. Return to previous text when ending drill

*Enhancements:* adjust repetition count based on error frequency; interleave normal characters; include bigrams derived from `confusions` keys.

## Switching to Real Backend
1. Run `server.js`:
```bash
npm init -y
npm install express cors jsonwebtoken body-parser
node server.js
```
2. Replace `mockApi` in `app.js` with fetch wrappers calling `http://localhost:4000/api/...`
3. Send Authorization header: `Bearer <token>` after login/signup.
4. Optionally sync sessions after `persistSession()` by posting record.

## Accessibility / A11y Notes
- `aria-live` region on test text for screen readers.
- Could add `role="status"` updates for WPM, accuracy.
- Provide high-contrast toggle (future task).
- Add keyboard navigation for dialog controls (already native) and suggestion selection.

## Performance Ideas
- Batch DOM updates with `requestAnimationFrame` if adding heavier per-keystroke effects.
- Move particle canvas off main thread (tsParticles already optimized; can further reduce number).
- Lazy-load optional panels (history) when opened.

## Future Roadmap
| Area | Improvement |
|------|-------------|
| Gamification | Streaks, XP, achievements, levels |
| Multiplayer | WebSocket race mode, ghost replays |
| Analytics | Charts for latency distribution, per-key heatmaps |
| AI Drills | ML-driven spaced repetition for weak keys |
| Security | Real password hashing + refresh tokens |
| PWA | Manifest + icons, add-to-home-screen prompts |
| I18n | Multiple keyboard layouts & language-specific corpora |
| Mobile UX | Larger key feedback, vibration API integration |

## React Migration Strategy
- Convert `engine.js` to TypeScript (`engine.ts`) and expose a custom hook `useTypingEngine()`.
- Components: `<TypingArea/>`, `<Suggestions/>`, `<Stats/>`, `<Keyboard/>`, `<AuthModal/>`, `<Toasts/>`.
- Context provider for auth + engine state.

## License
Prototype stage; choose a license before publishing (MIT recommended for openness).

---
Feel free to request any of the roadmap features next and they can be scaffolded incrementally.
