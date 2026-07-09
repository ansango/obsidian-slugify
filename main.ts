import { App, Modal, Notice, Plugin, Setting, TAbstractFile, TFile, TFolder } from "obsidian";
import { t } from "./i18n";

interface RenameEntry {
	file: TFile;
	oldPath: string;
	newPath: string;
}

function slugify(name: string): string {
	return name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "") // quita acentos
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

function getMarkdownFilesUnder(folder: TFolder): TFile[] {
	const files: TFile[] = [];

	for (const child of folder.children) {
		if (child instanceof TFolder) {
			files.push(...getMarkdownFilesUnder(child));
		} else if (child instanceof TFile && child.extension === "md") {
			files.push(child);
		}
	}

	return files;
}

function collectMarkdownFiles(items: TAbstractFile[]): TFile[] {
	const seen = new Map<string, TFile>();

	for (const item of items) {
		const files = item instanceof TFolder
			? getMarkdownFilesUnder(item)
			: item instanceof TFile && item.extension === "md"
				? [item]
				: [];

		for (const file of files) seen.set(file.path, file);
	}

	return [...seen.values()];
}

function computeRenames(files: TFile[]): RenameEntry[] {
	const renames: RenameEntry[] = [];

	for (const file of files) {
		const slug = slugify(file.basename);
		if (!slug || slug === file.basename) continue;

		const parentPath = file.parent && file.parent.path !== "/" ? `${file.parent.path}/` : "";
		const newPath = `${parentPath}${slug}.${file.extension}`;

		if (newPath === file.path) continue;

		renames.push({ file, oldPath: file.path, newPath });
	}

	return renames;
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

		contentEl.createEl("h2", { text: this.heading });
		contentEl.createEl("p", { text: t.modalDescription });

		const list = contentEl.createEl("div", { cls: "slugify-filenames-list" });
		list.style.maxHeight = "300px";
		list.style.overflowY = "auto";
		list.style.fontFamily = "var(--font-monospace)";
		list.style.fontSize = "var(--font-smaller)";
		list.style.marginBottom = "1em";

		for (const entry of this.renames) {
			const row = list.createEl("div", { cls: "slugify-filenames-row" });
			row.style.marginBottom = "0.25em";
			row.createSpan({ text: entry.oldPath });
			row.createSpan({ text: " → " });
			row.createSpan({ text: entry.newPath, cls: "slugify-filenames-new" });
		}

		new Setting(contentEl)
			.addButton((btn) =>
				btn.setButtonText(t.buttonCancel).onClick(() => this.close())
			)
			.addButton((btn) =>
				btn
					.setButtonText(t.buttonApply(this.renames.length))
					.setCta()
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

export default class SlugifyFilenamesPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "slugify-vault-filenames",
			name: t.commandName,
			callback: () => this.runSlugify(this.app.vault.getMarkdownFiles(), t.scopeVault),
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
							const files = collectMarkdownFiles([file]);
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
							const mdFiles = collectMarkdownFiles(relevant);
							this.runSlugify(mdFiles, t.scopeSelection(relevant.length));
						});
				});
			})
		);
	}

	onunload() {}

	private runSlugify(files: TFile[], scopeLabel: string) {
		const renames = computeRenames(files);

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
			const collision = this.app.vault.getAbstractFileByPath(entry.newPath);
			if (collision && collision !== entry.file) {
				skipped++;
				console.warn(
					`Obsidian Slugify: skipped "${entry.oldPath}" -> "${entry.newPath}" (a file with that name already exists).`
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
				console.error(`Obsidian Slugify: error renaming "${entry.oldPath}"`, err);
			}
		}

		new Notice(
			skipped > 0
				? t.noticeDoneWithSkipped(done, skipped)
				: t.noticeDone(done)
		);
	}
}
