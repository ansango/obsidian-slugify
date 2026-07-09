import { test, expect } from "bun:test";
import {
	slugify,
	isExcluded,
	isRenamableFile,
	computeRenames,
	annotateCollisions,
	type FileLike,
	type VaultLike,
} from "../logic";

function file(path: string, extension = "md"): FileLike {
	const slash = path.lastIndexOf("/");
	const dir = slash === -1 ? "" : path.slice(0, slash);
	const nameWithExt = slash === -1 ? path : path.slice(slash + 1);
	const basename = nameWithExt.replace(new RegExp(`\\.${extension}$`), "");
	return {
		path,
		basename,
		extension,
		parent: { path: dir || "/" },
	};
}

function vaultWith(existingPaths: string[], byPath: Map<string, FileLike> = new Map()): VaultLike {
	return {
		getAbstractFileByPath(path: string) {
			if (byPath.has(path)) return byPath.get(path);
			return existingPaths.includes(path) ? {} : null;
		},
	};
}

test("slugify: lowercases and replaces spaces", () => {
	expect(slugify("Hello World", "-")).toBe("hello-world");
});

test("slugify: strips accents", () => {
	expect(slugify("Métodos de Array", "-")).toBe("metodos-de-array");
});

test("slugify: collapses multiple separators and trims edges", () => {
	expect(slugify("  a   b -- c  ", "-")).toBe("a-b-c");
});

test("slugify: is idempotent on already-slugified names", () => {
	expect(slugify("already-slug-case", "-")).toBe("already-slug-case");
});

test("slugify: supports underscore as separator", () => {
	expect(slugify("Hello World Again", "_")).toBe("hello_world_again");
});

test("slugify: non-alphanumeric-only name becomes empty", () => {
	expect(slugify("¿¡!!!?", "-")).toBe("");
});

test("isExcluded: matches exact folder and subfolders, not partial names", () => {
	const excluded = ["templates", "archive/2024"];
	expect(isExcluded("templates/note.md", excluded)).toBe(true);
	expect(isExcluded("templates", excluded)).toBe(true);
	expect(isExcluded("archive/2024/x.md", excluded)).toBe(true);
	expect(isExcluded("archive/2023/x.md", excluded)).toBe(false);
	expect(isExcluded("templates-old/note.md", excluded)).toBe(false);
	expect(isExcluded("notes/note.md", excluded)).toBe(false);
});

test("isRenamableFile: markdown is always renamable", () => {
	expect(isRenamableFile({ extension: "md" }, false)).toBe(true);
	expect(isRenamableFile({ extension: "md" }, true)).toBe(true);
});

test("isRenamableFile: non-markdown only when attachments are included", () => {
	expect(isRenamableFile({ extension: "png" }, false)).toBe(false);
	expect(isRenamableFile({ extension: "png" }, true)).toBe(true);
});

test("computeRenames: skips files already in slug-case", () => {
	const f = file("notes/already-fine.md");
	const vault = vaultWith([]);
	const renames = computeRenames(vault, [f], "-");
	expect(renames.length).toBe(0);
});

test("computeRenames: proposes a new path for a non-slug name", () => {
	const f = file("notes/Mi Nota Genial.md");
	const vault = vaultWith([]);
	const renames = computeRenames(vault, [f], "-");
	expect(renames.length).toBe(1);
	expect(renames[0].newPath).toBe("notes/mi-nota-genial.md");
	expect(renames[0].collision).toBe(false);
});

test("computeRenames: flags collision with an existing different file", () => {
	const f = file("notes/Mi Nota.md");
	const vault = vaultWith(["notes/mi-nota.md"]);
	const renames = computeRenames(vault, [f], "-");
	expect(renames.length).toBe(1);
	expect(renames[0].collision).toBe(true);
});

test("computeRenames: two files slugifying to the same target both flagged", () => {
	const a = file("notes/Café.md");
	const b = file("notes/Cafe.md");
	const vault = vaultWith([]);
	const renames = computeRenames(vault, [a, b], "-");
	expect(renames.length).toBe(2);
	expect(renames.every((r) => r.collision)).toBe(true);
});

test("annotateCollisions: re-evaluates after an entry's slug is edited", () => {
	const a = file("notes/Uno Dos.md");
	const vault = vaultWith(["notes/otro-nombre.md"]);
	const renames = computeRenames(vault, [a], "-");
	expect(renames[0].collision).toBe(false);

	renames[0].slug = "otro-nombre";
	renames[0].newPath = "notes/otro-nombre.md";
	annotateCollisions(vault, renames);
	expect(renames[0].collision).toBe(true);
});
