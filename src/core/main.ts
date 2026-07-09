import { Notice, Plugin, TFile, TFolder } from "obsidian";
import { computeRenames, isExcluded, isRenamableFile } from "../utils/logic";
import { t } from "../utils/i18n";
import { collectFiles } from "./files";
import { SlugifyModal } from "./modal";
import { SlugifySettingTab } from "./settings-tab";
import { DEFAULT_SETTINGS, type RenameEntry, type SlugifySettings, type UndoEntry } from "./types";

export default class SlugifyPlugin extends Plugin {
	settings: SlugifySettings;
	private lastBatch: UndoEntry[] | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SlugifySettingTab(this.app, this));

		this.addCommand({
			id: "vault-filenames",
			name: t.commandName,
			callback: () => this.runVaultSlugify(),
		});

		this.addCommand({
			id: "undo-last",
			name: t.undoCommandName,
			callback: () => {
				void this.undoLastBatch();
			},
		});

		this.addRibbonIcon("case-sensitive", t.ribbonTooltip, () => this.runVaultSlugify());

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				const isFolder = file instanceof TFolder;
				const isRenamable = file instanceof TFile && isRenamableFile(file, this.settings.includeAttachments);
				if (!isFolder && !isRenamable) return;

				menu.addItem((item) => {
					item
						.setTitle(isFolder ? t.menuFolder : t.menuFile)
						.setIcon("case-sensitive")
						.onClick(() => {
							const files = collectFiles([file], this.settings.excludedFolders, this.settings.includeAttachments);
							this.runSlugify(files, isFolder ? t.scopeFolder(file.name) : t.scopeFile(file.name));
						});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files) => {
				const relevant = files.filter(
					(f) => f instanceof TFolder || (f instanceof TFile && isRenamableFile(f, this.settings.includeAttachments))
				);
				if (relevant.length === 0) return;

				menu.addItem((item) => {
					item
						.setTitle(t.menuSelection(relevant.length))
						.setIcon("case-sensitive")
						.onClick(() => {
							const targetFiles = collectFiles(relevant, this.settings.excludedFolders, this.settings.includeAttachments);
							this.runSlugify(targetFiles, t.scopeSelection(relevant.length));
						});
				});
			})
		);
	}

	onunload() {}

	async loadSettings() {
		const loaded = (await this.loadData()) as Partial<SlugifySettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private runVaultSlugify() {
		const allFiles = this.settings.includeAttachments
			? this.app.vault.getFiles()
			: this.app.vault.getMarkdownFiles();
		const files = allFiles.filter((f) => !isExcluded(f.path, this.settings.excludedFolders));
		this.runSlugify(files, t.scopeVault);
	}

	private runSlugify(files: TFile[], scopeLabel: string) {
		const renames = computeRenames(this.app.vault, files, this.settings.separator || "-");

		if (renames.length === 0) {
			new Notice(t.noticeNothingToRename(scopeLabel));
			return;
		}

		new SlugifyModal(
			this.app,
			renames,
			t.modalHeading(renames.length, scopeLabel),
			() => {
				void this.applyRenames(renames);
			}
		).open();
	}

	private async applyRenames(renames: RenameEntry[]) {
		let skipped = 0;
		const succeeded: UndoEntry[] = [];

		for (const entry of renames) {
			if (entry.collision) {
				skipped++;
				console.warn(
					`Slugify: skipped "${entry.oldPath}" -> "${entry.newPath}" (name collision, flagged in preview).`
				);
				continue;
			}

			try {
				// fileManager.renameFile automatically updates links pointing
				// to this file across the rest of the vault.
				await this.app.fileManager.renameFile(entry.file, entry.newPath);
				succeeded.push({ oldPath: entry.oldPath, newPath: entry.newPath });
			} catch (err) {
				skipped++;
				console.error(`Slugify: error renaming "${entry.oldPath}"`, err);
			}
		}

		if (succeeded.length > 0) {
			this.lastBatch = succeeded;
		}

		new Notice(
			skipped > 0
				? t.noticeDoneWithSkipped(succeeded.length, skipped)
				: t.noticeDone(succeeded.length)
		);
	}

	private async undoLastBatch() {
		const batch = this.lastBatch;
		if (!batch || batch.length === 0) {
			new Notice(t.noticeNothingToUndo);
			return;
		}

		this.lastBatch = null;

		let done = 0;
		let skipped = 0;

		for (const { oldPath, newPath } of [...batch].reverse()) {
			const file = this.app.vault.getAbstractFileByPath(newPath);
			if (!(file instanceof TFile)) {
				skipped++;
				console.warn(`Slugify: cannot undo "${newPath}" -> "${oldPath}" (file not found).`);
				continue;
			}

			const collision = this.app.vault.getAbstractFileByPath(oldPath);
			if (collision && collision !== file) {
				skipped++;
				console.warn(`Slugify: cannot undo "${newPath}" -> "${oldPath}" (a file already exists there).`);
				continue;
			}

			try {
				await this.app.fileManager.renameFile(file, oldPath);
				done++;
			} catch (err) {
				skipped++;
				console.error(`Slugify: error undoing "${newPath}" -> "${oldPath}"`, err);
			}
		}

		new Notice(
			skipped > 0
				? t.noticeUndoDoneWithSkipped(done, skipped)
				: t.noticeUndoDone(done)
		);
	}
}
