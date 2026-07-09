# Obsidian Slugify

[![CI](https://github.com/ansango/obsidian-slugify/actions/workflows/ci.yml/badge.svg)](https://github.com/ansango/obsidian-slugify/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/ansango/obsidian-slugify)](https://github.com/ansango/obsidian-slugify/releases/latest)

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

- **Ribbon icon** (sidebar) or **command palette** → "Rename files to slug-case (whole vault)".
- **Command palette** → "Undo last slugify".
- **Right-click a folder** → "Slugify: rename files in this folder".
- **Right-click a file** → "Slugify: rename this file".
- **Select multiple files/folders**, right-click → "Slugify: rename selection (N items)".

In every case a modal shows the full list of renames — editable — before anything is applied.

## Settings

- **Excluded folders** — one path per line; files inside them (and their subfolders) are always skipped, everywhere.
- **Separator** — `-` or `_`, used in place of spaces and other non-alphanumeric characters.
- **Include attachments** — off by default. When enabled, non-markdown files (images, PDFs, etc.) become eligible for renaming too, and the file/folder/selection context menu items apply to them as well.

## Permissions

The plugin calls `vault.getFiles()` / `vault.getMarkdownFiles()` to enumerate files in the vault. This is required for its core function (finding which files to rename) — it never reads file contents or sends anything over the network.

## Verifying a release

`main.js` and `styles.css` in each release are signed with [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations), proving they were built by this repo's `release.yml` workflow from the tagged source. Verify a downloaded asset with the [GitHub CLI](https://cli.github.com/):

```bash
gh attestation verify main.js --repo ansango/obsidian-slugify
```

## Development

Uses [Bun](https://bun.sh) for both package management and running scripts. Bundling still goes through esbuild (the approach recommended by Obsidian's plugin docs).

```bash
bun install
bun run dev     # watch mode, rebuilds main.js on change
bun run build   # type-check + production build (minified, no sourcemap)
bun test        # run the test suite
```

The plugin is plain TypeScript + the Obsidian API — no UI framework, structured under `src/`:

- `src/core/` — the Plugin entry point, the confirmation modal, the settings tab, and vault file-tree helpers.
- `src/utils/` — pure logic (slugify, collision detection) decoupled from Obsidian's types so it's unit-testable with `bun:test` (colocated as `logic.test.ts`), plus the English/Spanish translations.
- `src/styles/` — the plugin's CSS, copied to the plugin root on every build.

## License

MIT
