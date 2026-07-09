# Obsidian Slugify

Rename files — and everything that links to them — to slug-case (lowercase, no accents, hyphens) right from Obsidian. No script, no terminal: pick a file, a folder, or a multi-selection, review the list, confirm.

## Why

Renaming files by hand to keep a consistent naming convention is tedious, and doing it outside Obsidian breaks wikilinks. This plugin uses Obsidian's own `fileManager.renameFile` API, so every link pointing to a renamed file is updated automatically — nothing breaks.

## Features

- Rename a single file, an entire folder (recursively), or a multi-selection from the file explorer context menu.
- Vault-wide command from the command palette.
- Preview modal listing every `old path → new path` before anything changes — nothing is renamed without explicit confirmation.
- Skips files that would collide with an existing name and reports them in the console.
- English and Spanish UI, following Obsidian's language setting (falls back to English).

## Install

Not yet on the Community Plugins list — manual install:

1. Download `main.js`, `manifest.json` and `styles.css` from this repo (or a release, once available).
2. Copy them into `<your-vault>/.obsidian/plugins/obsidian-slugify/`.
3. Reload Obsidian and enable **Obsidian Slugify** under Settings → Community plugins.

## Usage

- **Command palette** → "Rename files to slug-case (whole vault)".
- **Right-click a folder** → "Slugify: rename files in this folder".
- **Right-click a file** → "Slugify: rename this file".
- **Select multiple files/folders**, right-click → "Slugify: rename selection (N items)".

In every case a modal shows the full list of renames before anything is applied.

## Development

```bash
npm install
npm run dev    # watch mode, rebuilds main.js on change
npm run build  # production build (minified, no sourcemap)
```

The plugin is plain TypeScript + the Obsidian API — no UI framework. Localized strings live in `i18n/en.ts` and `i18n/es.ts`.

## License

MIT
