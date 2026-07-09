import { TAbstractFile, TFile, TFolder } from "obsidian";
import { isExcluded, isRenamableFile } from "../utils/logic";

export function getFilesUnder(folder: TFolder, excludedFolders: string[], includeAttachments: boolean): TFile[] {
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

export function collectFiles(items: TAbstractFile[], excludedFolders: string[], includeAttachments: boolean): TFile[] {
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
