import { App, ButtonComponent, Modal, Setting } from "obsidian";
import { annotateCollisions, syncNewPath } from "../utils/logic";
import { t } from "../utils/i18n";
import type { RenameEntry } from "./types";

export class SlugifyModal extends Modal {
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
		annotateCollisions(this.app.vault, this.renames);

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
