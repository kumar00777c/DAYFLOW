# DAYFLOW — Personal Command Center

DAYFLOW is a simple, local-first productivity dashboard built with vanilla HTML, CSS and JavaScript. It helps you plan daily tasks, organize projects and review your progress — without creating an account or depending on a backend.

## Features

- **Dashboard:** today's task totals, completion progress and active projects.
- **Daily tasks:** create, edit, complete and delete tasks; assign a date, priority and optional notes; browse tasks for different days.
- **Projects:** organize projects with descriptions, status, progress and optional deadlines.
- **Reports:** review completed and pending tasks over the last 7, 14 or 30 days.
- **Data backup:** export your workspace to a JSON file and import it later.
- **Responsive interface:** designed for desktop and mobile screens.
- **Local-first storage:** tasks and projects are saved in this browser's local storage.
- **Installable app:** the web app manifest provides app icons and standalone display settings for supported browsers.
- **Offline app shell:** the service worker caches the core app files and can load the interface when the network is unavailable.

## Run DAYFLOW locally

1. Download or extract the `DAYFLOW` project folder.
2. Serve the folder from `localhost` using a local development server.
3. Open the local address in a modern browser.

For example, if Python is installed, open a terminal in the `DAYFLOW` folder and run:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

You can also open `index.html` directly, but browsers generally require **HTTPS or localhost** for service workers. The offline caching feature will therefore not be available when the page is opened using a `file://` URL.

## Install on a device

DAYFLOW is configured as an installable web app through `manifest.json`. When hosted over HTTPS, use your browser's **Install app** or **Add to Home Screen** option if it is available. The app icons are stored in the `icons/` folder.

## Offline and update behaviour

- On first visit, the service worker saves the core DAYFLOW files in a browser cache.
- When online, it tries the network first so updated app files can be fetched and saved.
- When offline, it falls back to the cached files.
- When the service worker is updated, older DAYFLOW shell caches are removed.

The service worker caches the app interface and static files; it does **not** sync, upload or back up your tasks and projects.

## Your data and privacy

DAYFLOW does not require an account, backend or API key. Your tasks and projects are stored in the browser profile on the device where you use the app. They are **not automatically synced** between devices or browsers.

Clearing browser site data, using private browsing, resetting the browser or uninstalling/clearing the app's site storage may erase your workspace. The service worker cache is separate from your task data and is not a backup.

**Make regular backups:** open **Settings → Export backup** and save the JSON file somewhere safe. To restore it, use **Settings → Import a backup**.

## Project files

- `index.html` — app structure and service worker registration
- `style.css` — visual design and responsive layout
- `app.js` — task/project logic, local storage and reports
- `manifest.json` — installable web app metadata and icons
- `service-worker.js` — app-shell caching and offline fallback
- `icons/` — favicon, Apple touch icon and app icons

## Technology

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`
- Web App Manifest
- Service Worker Cache API

DAYFLOW is a personal, local-first project. No third-party API keys or cloud services are needed for its core functionality.
