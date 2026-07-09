import type { TFile } from "obsidian";
import type { RenameEntry as BaseRenameEntry } from "../utils/logic";

export interface SlugifySettings {
	excludedFolders: string[];
	separator: string;
	includeAttachments: boolean;
}

export const DEFAULT_SETTINGS: SlugifySettings = {
	excludedFolders: [],
	separator: "-",
	includeAttachments: false,
};

export type RenameEntry = BaseRenameEntry<TFile>;

export interface UndoEntry {
	oldPath: string;
	newPath: string;
}
