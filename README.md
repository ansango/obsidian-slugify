# Obsidian Slugify

Rename files — and everything that links to them — to slug-case (lowercase, no accents, hyphens) right from Obsidian. No script, no terminal: pick a file, a folder, or a multi-selection, review the list, edit it if needed, confirm.

## Why

Renaming files by hand to keep a consistent naming convention is tedious, and doing it outside Obsidian breaks wikilinks. This plugin uses Obsidian's own `fileManager.renameFile` API, so every link pointing to a renamed file is updated automatically — nothing breaks.

## Features

- Rename a single file, an entire folder (recursively), or a multi-selection from the file explorer context menu.
- Vault-wide command from the command palette.
- Preview modal listing every `old path → new path` before anything changes — nothing is renamed without explicit confirmation.
- Each proposed name is editable in the preview; collisions are recomputed live as you edit.
- Collisions (against an existing file, or two renames targeting the same path) are flagged in the preview instead of silently skipped.
- "Undo last slugify" command reverts the most recent batch (in-memory, single level).
- Settings: excluded folders (skipped everywhere), configurable separator (`-`/`_`), and an opt-in toggle to also rename non-markdown attachments.
- English and Spanish UI, following Obsidian's language setting (falls back to English).

## Install

Not yet on the Community Plugins list — manual install:

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/ansango/obsidian-slugify/releases/latest).
2. Copy them into `<your-vault>/.obsidian/plugins/slugify/`.
3. Reload Obsidian and enable **Slugify** under Settings → Community plugins.

## Usage

- **Command palette** → "Rename files to slug-case (whole vault)" or "Undo last slugify".
- **Right-click a folder** → "Slugify: rename files in this folder".
- **Right-click a file** → "Slugify: rename this file".
- **Select multiple files/folders**, right-click → "Slugify: rename selection (N items)".

In every case a modal shows the full list of renames — editable — before anything is applied.

## Development

Uses [Bun](https://bun.sh) for both package management and running scripts. Bundling still goes through esbuild (the approach recommended by Obsidian's plugin docs).

```bash
bun install
bun run dev     # watch mode, rebuilds main.js on change
bun run build   # type-check + production build (minified, no sourcemap)
bun test        # run the test suite
```

The plugin is plain TypeScript + the Obsidian API — no UI framework. Pure logic (slugify, collision detection) lives in `logic.ts`, decoupled from Obsidian's types so it can be unit tested directly with `bun:test`. Localized strings live in `i18n/en.ts` and `i18n/es.ts`.

## License

MIT
