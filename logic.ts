// Pure logic, free of Obsidian imports, so it can be unit tested in plain Node.
// Uses structural typing: real Obsidian TFile/Vault objects satisfy these
// interfaces already, so main.ts can pass them directly.

export interface FileLike {
	path: string;
	basename: string;
	extension: string;
	parent: { path: string } | null;
}

export interface VaultLike {
	getAbstractFileByPath(path: string): unknown;
}

export interface RenameEntry<F extends FileLike = FileLike> {
	file: F;
	oldPath: string;
	parentPath: string;
	extension: string;
	slug: string;
	newPath: string;
	collision: boolean;
}

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(name: string, separator: string): string {
	const sep = escapeRegExp(separator);
	return name
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "") // strip accents
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, separator)
		.replace(new RegExp(`^${sep}+|${sep}+$`, "g"), "")
		.replace(new RegExp(`${sep}{2,}`, "g"), separator);
}

export function isExcluded(path: string, excludedFolders: string[]): boolean {
	return excludedFolders.some((folder) => {
		const normalized = folder.replace(/\/+$/, "");
		if (!normalized) return false;
		return path === normalized || path.startsWith(`${normalized}/`);
	});
}

export function isRenamableFile(file: Pick<FileLike, "extension">, includeAttachments: boolean): boolean {
	return includeAttachments || file.extension === "md";
}

export function syncNewPath<F extends FileLike>(entry: RenameEntry<F>): void {
	entry.newPath = `${entry.parentPath}${entry.slug}.${entry.extension}`;
}

export function computeRenames<F extends FileLike>(
	vault: VaultLike,
	files: F[],
	separator: string
): RenameEntry<F>[] {
	const renames: RenameEntry<F>[] = [];

	for (const file of files) {
		const slug = slugify(file.basename, separator);
		if (!slug || slug === file.basename) continue;

		const parentPath = file.parent && file.parent.path !== "/" ? `${file.parent.path}/` : "";

		const entry: RenameEntry<F> = {
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

	annotateCollisions(vault, renames);

	return renames;
}

export function annotateCollisions<F extends FileLike>(vault: VaultLike, renames: RenameEntry<F>[]): void {
	const destCount = new Map<string, number>();
	for (const r of renames) destCount.set(r.newPath, (destCount.get(r.newPath) ?? 0) + 1);

	for (const r of renames) {
		const existing = vault.getAbstractFileByPath(r.newPath);
		const existsElsewhere = existing !== null && existing !== r.file;
		const duplicateTarget = (destCount.get(r.newPath) ?? 0) > 1;
		r.collision = existsElsewhere || duplicateTarget;
	}
}
