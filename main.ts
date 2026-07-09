import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, TFolder } from "obsidian";
import { t } from "./i18n";

interface SlugifySettings {
	excludedFolders: string[];
	separator: string;
}

const DEFAULT_SETTINGS: SlugifySettings = {
	excludedFolders: [],
	separator: "-",
};

interface RenameEntry {
	file: TFile;
	oldPath: string;
	newPath: string;
	collision: boolean;
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

function getMarkdownFilesUnder(folder: TFolder, excludedFolders: string[]): TFile[] {
	const files: TFile[] = [];

	for (const child of folder.children) {
		if (isExcluded(child.path, excludedFolders)) continue;

		if (child instanceof TFolder) {
			files.push(...getMarkdownFilesUnder(child, excludedFolders));
		} else if (child instanceof TFile && child.extension === "md") {
			files.push(child);
		}
	}

	return files;
}

function collectMarkdownFiles(items: TAbstractFile[], excludedFolders: string[]): TFile[] {
	const seen = new Map<string, TFile>();

	for (const item of items) {
		if (isExcluded(item.path, excludedFolders)) continue;

		const files = item instanceof TFolder
			? getMarkdownFilesUnder(item, excludedFolders)
			: item instanceof TFile && item.extension === "md"
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
		const newPath = `${parentPath}${slug}.${file.extension}`;

		if (newPath === file.path) continue;

		renames.push({ file, oldPath: file.path, newPath, collision: false });
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

	constructor(app: App, renames: RenameEntry[], heading: string, onConfirm: () => void) {
		super(app);
		this.renames = renames;
		this.heading = heading;
		this.onConfirm = onConfirm;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		const applicable = this.renames.filter((r) => !r.collision);
		const collisions = this.renames.filter((r) => r.collision);

		contentEl.createEl("h2", { text: this.heading });
		contentEl.createEl("p", { text: t.modalDescription });

		if (collisions.length > 0) {
			contentEl.createEl("p", {
				text: t.collisionNote(collisions.length),
				cls: "slugify-collision-note",
			});
		}

		const list = contentEl.createEl("div", { cls: "slugify-list" });

		for (const entry of this.renames) {
			const row = list.createEl("div", {
				cls: entry.collision ? "slugify-row slugify-row-collision" : "slugify-row",
			});
			row.createSpan({ text: entry.oldPath });
			row.createSpan({ text: " → " });
			row.createSpan({ text: entry.newPath, cls: "slugify-new" });
			if (entry.collision) {
				row.createSpan({ text: ` (${t.collisionLabel})`, cls: "slugify-collision-label" });
			}
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText(t.buttonCancel).onClick(() => this.close())
			)
			.addButton((btn) =>
				btn
					.setButtonText(t.buttonApply(applicable.length))
					.setCta()
					.setDisabled(applicable.length === 0)
					.onClick(() => {
						this.onConfirm();
						this.close();
					})
			);
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
	}
}

export default class SlugifyPlugin extends Plugin {
	settings: SlugifySettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SlugifySettingTab(this.app, this));

		this.addCommand({
			id: "slugify-vault-filenames",
			name: t.commandName,
			callback: () => {
				const files = this.app.vault
					.getMarkdownFiles()
					.filter((f) => !isExcluded(f.path, this.settings.excludedFolders));
				this.runSlugify(files, t.scopeVault);
			},
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				const isFolder = file instanceof TFolder;
				const isMarkdown = file instanceof TFile && file.extension === "md";
				if (!isFolder && !isMarkdown) return;

				menu.addItem((item) => {
					item
						.setTitle(isFolder ? t.menuFolder : t.menuFile)
						.setIcon("case-sensitive")
						.onClick(() => {
							const files = collectMarkdownFiles([file], this.settings.excludedFolders);
							this.runSlugify(files, isFolder ? t.scopeFolder(file.name) : t.scopeFile(file.name));
						});
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("files-menu", (menu, files) => {
				const relevant = files.filter((f) => f instanceof TFolder || (f instanceof TFile && f.extension === "md"));
				if (relevant.length === 0) return;

				menu.addItem((item) => {
					item
						.setTitle(t.menuSelection(relevant.length))
						.setIcon("case-sensitive")
						.onClick(() => {
							const mdFiles = collectMarkdownFiles(relevant, this.settings.excludedFolders);
							this.runSlugify(mdFiles, t.scopeSelection(relevant.length));
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
		let done = 0;
		let skipped = 0;

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
				done++;
			} catch (err) {
				skipped++;
				console.error(`Slugify: error renaming "${entry.oldPath}"`, err);
			}
		}

		new Notice(
			skipped > 0
				? t.noticeDoneWithSkipped(done, skipped)
				: t.noticeDone(done)
		);
	}
}
