# Dispatch · Tech — mobile (Expo)

A React Native + Expo scaffold that renders today's Dispatch sample edition in a clean, editorial dark theme. Pulls from the same `/api/sample` endpoint the website uses.

## Run

```bash
cd mobile
npm install
npx expo start
```

Then:
- Press `i` to open the iOS Simulator
- Press `a` to open Android Emulator
- Scan the QR with the Expo Go app on your phone (must be on the same Wi-Fi as the backend)

## Configure API URL

The default API URL is `http://localhost:5180`, configured in `app.json` under `expo.extra.apiUrl`. For deployment, point it at your live backend:

```json
"extra": { "apiUrl": "https://your-dispatch.onrender.com" }
```

Note: iOS Simulator can hit `localhost`; Expo Go on a real phone needs your laptop's LAN IP (e.g. `http://192.168.1.42:5180`).

## What this is (v0.1)

- Single screen rendering today's sample brief (lede, Editor's Pick, sections)
- Pull-to-refresh
- Tappable stories open in the system browser
- Editorial dark theme matching the web app

## What's next

- **Auth** — magic-link flow inside the app or "deep-link from email" handoff
- **Personalized brief** — `/api/brief` with role + skill + domains stored in AsyncStorage
- **Push notifications** — Expo notifications service, fire when the morning cron sends an edition
- **Story bookmarks** — sync with the backend `/api/bookmarks` endpoint
- **Streaming** — render stories progressively via the SSE endpoint
