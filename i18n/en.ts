export default {
	commandName: "Rename files to slug-case (whole vault)",
	scopeVault: "the whole vault",
	menuFolder: "Slugify: rename files in this folder",
	menuFile: "Slugify: rename this file",
	menuSelection: (n: number) => `Slugify: rename selection (${n} items)`,
	scopeFolder: (name: string) => `folder "${name}"`,
	scopeFile: (name: string) => `"${name}"`,
	scopeSelection: (n: number) => `the selection (${n} items)`,
	noticeNothingToRename: (scope: string) => `Nothing to rename in ${scope}: already in slug-case.`,
	modalHeading: (n: number, scope: string) => `Slugify: ${n} file(s) in ${scope}`,
	modalDescription:
		"The following files will be renamed, and any links pointing to them will be updated automatically:",
	buttonCancel: "Cancel",
	buttonApply: (n: number) => `Rename ${n} file(s)`,
	noticeDoneWithSkipped: (done: number, skipped: number) =>
		`${done} file(s) renamed, ${skipped} skipped (see console).`,
	noticeDone: (done: number) => `${done} file(s) renamed successfully.`,
	collisionNote: (n: number) =>
		`${n} item(s) skipped due to a name collision with an existing or another renamed file.`,
	collisionLabel: "collision, will be skipped",
};
