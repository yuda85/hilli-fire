# Hilli Fire

Fire sprinkler hydraulic calculation app — produces NFPA-13 calculations and Elite-Software-Fire-style PDF reports.

Built with **Angular 21** (signals, new control flow, standalone components), **Angular Material** (dark theme), and **Firebase** (Auth + Firestore + Hosting).

## Local setup

Angular 21 requires Node 20 or 22. If your default `node` is newer (e.g. 25/26), use the Node 22 binary explicitly:

```bash
brew install node@22
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

Install dependencies:

```bash
npm install
```

### Firebase config

1. Create a Firebase project at https://console.firebase.google.com/.
2. Enable **Authentication → Email/Password** sign-in.
3. Enable **Firestore Database** (production mode is fine; rules are in `firestore.rules`).
4. Add a Web App and copy the config object.
5. Paste the config into `src/environments/environment.ts` and `src/environments/environment.prod.ts`, replacing the `REPLACE_ME` placeholders.

### Run

```bash
npm start          # Dev server at http://localhost:4200
npm test           # Vitest
npm run build      # Production build to dist/
```

### Firebase emulators (optional)

```bash
npm i -g firebase-tools
firebase login
firebase emulators:start
```

Set `useEmulators: true` in the environment file to point the app at the local emulator suite.

### Deploy

```bash
firebase deploy --only hosting,firestore:rules
```

## Project structure

See `/Users/yehudab/.claude/plans/hi-claude-this-magical-dove.md` for the full plan and roadmap. Quick map:

- `src/app/core/` — auth, firebase, models, projects service
- `src/app/shared/` — app shell, reusable UI
- `src/app/features/` — auth, projects-list, project-editor
- `src/app/calc/` — pure-TS hydraulic calculation engine (Phase 3)
- `src/app/reporting/` — pdfmake-based PDF report (Phase 5)
- `reference/` — Elite Software Fire reference PDF used for validation

## Reference report

`reference/beit-hayot-elite-reference.pdf` is the source-of-truth for layout and calculation accuracy. The calc engine targets ≤1% deviation from these numbers.

The validation fixture is at [src/app/calc/__fixtures__/beit-hayot.ts](src/app/calc/__fixtures__/beit-hayot.ts) and the unit tests in [src/app/calc/calc.spec.ts](src/app/calc/calc.spec.ts) verify the engine output matches Elite's published values:

- HMD = node 6 at ≈ 12.12 psi / 19.49 gpm
- Total sprinkler flow ≈ 410.96 gpm
- Inflow residual pressure ≈ 36.17 psi
- Max velocity ≈ 9.25 ft/s (pipe 50 → 60)

Run `npm test` to verify all seven assertions pass.
