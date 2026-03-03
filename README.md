# MyNotes

A lightweight desktop note-taking app built with **Electron** + **React** + **Vite**. Notes are persisted to disk via Electron's IPC bridge — no browser storage involved.

---

## Features

- Create, edit, and delete notes with **Markdown support** (bold, italic, strikethrough, headings, code blocks, checkboxes, blockquotes, lists, and more)
- **Live editor modes**: Edit, Split (side-by-side), and Preview
- **Markdown toolbar** for quick formatting
- **Categories**: Personal, Work, Ideas, Study, Health, Other — each with a color badge
- **Search & filter** notes by keyword and category
- **Reminders** with native OS notifications (via `Notification` API in Electron)
- **Statistics view**: total notes, notes this week, reminders set, and categories in use — with per-category progress bars
- **Dark / Light theme** toggle
- **Persistent storage**: notes are saved to a JSON file in the OS user-data directory

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| UI        | React 18                            |
| Bundler   | Vite 5                              |
| Desktop   | Electron 29                         |
| Packaging | electron-builder                    |
| IPC       | `contextBridge` + `ipcRenderer`     |

---

## Project Structure

```
MyNotes/
├── main.js          # Electron main process (window, IPC handlers, file I/O)
├── preload.js       # Context bridge — exposes electronAPI to the renderer
├── vite.config.js   # Vite configuration
├── index.html       # Entry HTML
└── src/
    ├── main.jsx     # React entry point
    └── App.jsx      # Main application component
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run in development

Starts Vite dev server and Electron concurrently:

```bash
npm run dev
```

### Build the web assets

```bash
npm run build
```

### Package as a distributable app

```bash
npm run dist
```

The packaged app will be output to the `dist-electron/` (or `release/`) folder. macOS builds are categorised as **Productivity** apps.

---

## Data Storage

Notes are stored as a JSON file at:

| Platform | Path                                                  |
|----------|-------------------------------------------------------|
| macOS    | `~/Library/Application Support/misnotes/notes.json`  |
| Windows  | `%APPDATA%\misnotes\notes.json`                       |
| Linux    | `~/.config/misnotes/notes.json`                       |

---

## IPC API

Exposed to the renderer via `window.electronAPI`:

| Method                  | Description                        |
|-------------------------|------------------------------------|
| `readNotes()`           | Reads notes from disk → `Note[]`   |
| `writeNotes(notes)`     | Persists the notes array to disk   |
| `notify({ title, body })` | Fires a native OS notification   |

---

## License

[MIT](LICENSE)
