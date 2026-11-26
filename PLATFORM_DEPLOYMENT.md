# ChessAI Pro — Cross-Platform Deployment Guide

## 1. Web & Progressive Web App (iPhone, iPad, Android, Desktop Browsers)
ChessAI Pro ships with a Web App Manifest (`/manifest.json`) and an offline Service Worker (`/sw.js`) that caches the Stockfish 19 WASM engine (`/engine/stockfish-19-lite-single.wasm`) so tactical analysis and AI play work offline.
- **Development**: `npm run dev` (starts `server.ts` on port `3000` with Vite middleware and `/api/*` Gemini proxy).
- **Production Build**: `npm run build` followed by `npm start`.
- **iOS (iPhone / iPad)**: Open the hosted URL in Safari → Share → **Add to Home Screen**.
- **Android**: Open in Chrome → Menu → **Install App**.

## 2. Windows & macOS Desktop Packaging (Electron)
An Electron main process (`electron/main.cjs`) and preload bridge (`electron/preload.cjs`) are included.
1. Install desktop packaging tools locally:
   ```bash
   npm install --save-dev electron electron-builder
   ```
2. Build the web bundle:
   ```bash
   npm run build
   ```
3. Run locally in Electron (pointing to your backend server for Gemini coaching, or standalone offline mode for Stockfish):
   ```bash
   npx electron electron/main.cjs
   ```
4. Package installers with `electron-builder` (`.dmg` for macOS, `.exe`/NSIS for Windows) by adding `"main": "electron/main.cjs"` and a `"build"` block in `package.json` targeting `mac` (`dmg`, `zip`) and `win` (`nsis`).

## 3. Environment & Cloud Configuration
- `GEMINI_API_KEY`: Required on the server (`server.ts`) for AI Chess Coach explanations and post-game reports.
- `firebase-applet-config.json`: Generated automatically by AI Studio Firebase provisioning; enables optional Google Sign-In and Firestore cloud sync for saved games, position analyses, and training progress.
