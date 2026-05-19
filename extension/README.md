# Dispatch · Tech — Chrome new-tab extension

Every new tab opens today's Dispatch brief.

## Install (dev / unpacked)

1. Open `chrome://extensions/`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. Open a new tab — today's Dispatch sample renders

## Configure

By default the extension hits `http://localhost:5180/api/sample`. To point it at your deployed Dispatch, click **Settings** in the masthead and paste your API URL (e.g. `https://your-dispatch.onrender.com`).

The URL is stored in localStorage scoped to the new-tab page.

## What it shows

The same "Today's sample" edition the public `/today` page shows — default ML / Web / Infra / Open-source beats, cached server-side for 6 hours.

## Notes

- Manifest v3. Tested on Chrome.
- No tracking, no auth — anonymous read of the public sample endpoint.
- Future: pull from the user's personalized `/api/me/today` once the user has signed in (would need extension auth via cookie permissions).
