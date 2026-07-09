import { App, ButtonComponent, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder } from "obsidian";
import { t } from "./i18n";

interface SlugifySettings {
	excludedFolders: string[];
	separator: string;
	includeAttachments: boolean;
}

const DEFAULT_SETTINGS: SlugifySettings = {
	excludedFolders: [],
	separator: "-",
	includeAttachments: false,
};

interface RenameEntry {
	file: TFile;
	oldPath: string;
	parentPath: string;
	extension: string;
	slug: string;
	newPath: string;
	collision: boolean;
}

function syncNewPath(entry: RenameEntry): void {
	entry.newPath = `${entry.parentPath}${entry.slug}.${entry.extension}`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(name: string, separator: string): string {
	const sep = escapeRegExp(separator);
	return name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "") // strip accents
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, separator)
		.replace(new RegExp(`^${sep}+|${sep}+$`, "g"), "")
		.replace(new RegExp(`${sep}{2,}`, "g"), separator);
}

function isExcluded(path: string, excludedFolders: string[]): boolean {
	return excludedFolders.some((folder) => {
		const normalized = folder.replace(/\/+$/, "");
		if (!normalized) return false;
		return path === normalized || path.startsWith(`${normalized}/`);
	});
}

function isRenamableFile(file: TFile, includeAttachments: boolean): boolean {
	return includeAttachments || file.extension === "md";
}

function getFilesUnder(folder: TFolder, excludedFolders: string[], includeAttachments: boolean): TFile[] {
	const files: TFile[] = [];

	for (const child of folder.children) {
		if (isExcluded(child.path, excludedFolders)) continue;

		if (child instanceof TFolder) {
			files.push(...getFilesUnder(child, excludedFolders, includeAttachments));
		} else if (child instanceof TFile && isRenamableFile(child, includeAttachments)) {
			files.push(child);
		}
	}

	return files;
}

function collectFiles(items: TAbstractFile[], excludedFolders: string[], includeAttachments: boolean): TFile[] {
	const seen = new Map<string, TFile>();

	for (const item of items) {
		if (isExcluded(item.path, excludedFolders)) continue;

		const files = item instanceof TFolder
			? getFilesUnder(item, excludedFolders, includeAttachments)
			: item instanceof TFile && isRenamableFile(item, includeAttachments)
				? [item]
				: [];

		for (const file of files) seen.set(file.path, file);
	}

	return [...seen.values()];
}

function computeRenames(app: App, files: TFile[], separator: string): RenameEntry[] {
	const renames: RenameEntry[] = [];

	for (const file of files) {
		const slug = slugify(file.basename, separator);
		if (!slug || slug === file.basename) continue;

		const parentPath = file.parent && file.parent.path !== "/" ? `${file.parent.path}/` : "";

		const entry: RenameEntry = {
			file,
			oldPath: file.path,
			parentPath,
			extension: file.extension,
			slug,
			newPath: "",
			collision: false,
		};
		syncNewPath(entry);

		if (entry.newPath === file.path) continue;

		renames.push(entry);
	}

	annotateCollisions(app, renames);

	return renames;
}

function annotateCollisions(app: App, renames: RenameEntry[]): void {
	const destCount = new Map<string, number>();
	for (const r of renames) destCount.set(r.newPath, (destCount.get(r.newPath) ?? 0) + 1);

	for (const r of renames) {
		const existing = app.vault.getAbstractFileByPath(r.newPath);
		const existsElsewhere = existing !== null && existing !== r.file;
		const duplicateTarget = (destCount.get(r.newPath) ?? 0) > 1;
		r.collision = existsElsewhere || duplicateTarget;
	}
}

class SlugifyModal extends Modal {
	private renames: RenameEntry[];
	private onConfirm: () => void;
	private heading: string;
	private listEl: HTMLElement;
	private noteEl: HTMLElement;
	private applyButton: ButtonComponent;

	constructor(app: App, renames: RenameEntry[], heading: string, onConfirm: () => void) {
		super(app);
		this.renames = renames;
		this.heading = heading;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", { text: this.heading });
		contentEl.createEl("p", { text: t.modalDescription });
		contentEl.createEl("p", { text: t.modalEditHint, cls: "setting-item-description" });

		this.noteEl = contentEl.createEl("p", { cls: "slugify-collision-note" });
		this.listEl = contentEl.createEl("div", { cls: "slugify-list" });

		new Setting(contentEl)
			.addButton((btn) => btn.setButtonText(t.buttonCancel).onClick(() => this.close()))
			.addButton((btn) => {
				this.applyButton = btn;
				btn.setCta().onClick(() => {
					this.onConfirm();
					this.close();
				});
			});

		this.renderList();
	}

	private renderList() {
		annotateCollisions(this.app, this.renames);

		const applicable = this.renames.filter((r) => !r.collision);
		const collisions = this.renames.filter((r) => r.collision);

		this.noteEl.setText(collisions.length > 0 ? t.collisionNote(collisions.length) : "");
		this.applyButton.setButtonText(t.buttonApply(applicable.length));
		this.applyButton.setDisabled(applicable.length === 0);

		this.listEl.empty();

		for (const entry of this.renames) {
			const row = this.listEl.createEl("div", {
				cls: entry.collision ? "slugify-row slugify-row-collision" : "slugify-row",
			});
			row.createSpan({ text: entry.oldPath });
			row.createSpan({ text: " → " });
			row.createSpan({ text: entry.parentPath });

			const input = row.createEl("input", {
				type: "text",
				value: entry.slug,
				cls: "slugify-edit-input",
			});
			input.addEventListener("change", () => {
				const value = input.value.trim();
				entry.slug = value.length > 0 ? value : entry.slug;
				syncNewPath(entry);
				this.renderList();
			});

			row.createSpan({ text: `.${entry.extension}` });

			if (entry.collision) {
				row.createSpan({ text: ` (${t.collisionLabel})`, cls: "slugify-collision-label" });
			}
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}

class SlugifySettingTab extends PluginSettingTab {
	private plugin: SlugifyPlugin;

	constructor(app: App, plugin: SlugifyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(t.settingsExcludedFoldersName)
			.setDesc(t.settingsExcludedFoldersDesc)
			.addTextArea((textArea) => {
				textArea
					.setPlaceholder(t.settingsExcludedFoldersPlaceholder)
					.setValue(this.plugin.settings.excludedFolders.join("\n"))
					.onChange(async (value) => {
						this.plugin.settings.excludedFolders = value
							.split("\n")
							.map((line) => line.trim())
							.filter((line) => line.length > 0);
						await this.plugin.saveSettings();
					});
				textArea.inputEl.rows = 6;
				textArea.inputEl.addClass("slugify-settings-textarea");
			});

		new Setting(containerEl)
			.setName(t.settingsSeparatorName)
			.setDesc(t.settingsSeparatorDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("-", "-")
					.addOption("_", "_")
					.setValue(this.plugin.settings.separator)
					.onChange(async (value) => {
						this.plugin.settings.separator = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName(t.settingsIncludeAttachmentsName)
			.setDesc(t.settingsIncludeAttachmentsDesc)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeAttachments).onChange(async (value) => {
					this.plugin.settings.includeAttachments = value;
					await this.plugin.saveSettings();
				})
			);
	}
}

interface UndoEntry {
	oldPath: string;
	newPath: string;
}

export default class SlugifyPlugin extends Plugin {
	settings: SlugifySettings;
	private lastBatch: UndoEntry[] | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SlugifySettingTab(this.app, this));

		this.addCommand({
			id: "slugify-vault-filenames",
			name: t.commandName,
			callback: () => {
				const allFiles = this.settings.includeAttachments
					? this.app.vault.getFiles()
					: this.app.vault.getMarkdownFiles();
				const files = allFiles.filter((f) => !isExcluded(f.path, this.settings.excludedFolders));
				this.runSlugify(files, t.scopeVault);
			},
		});

		this.addCommand({
			id: "slugify-undo-last",
			name: t.undoCommandName,
			callback: () => this.undoLastBatch(),
		});

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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private runSlugify(files: TFile[], scopeLabel: string) {
		const renames = computeRenames(this.app, files, this.settings.separator || "-");

		if (renames.length === 0) {
			new Notice(t.noticeNothingToRename(scopeLabel));
			return;
		}

		new SlugifyModal(
			this.app,
			renames,
			t.modalHeading(renames.length, scopeLabel),
			() => this.applyRenames(renames)
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
