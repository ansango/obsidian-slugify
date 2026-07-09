export default {
	commandName: "Renombrar archivos a slug-case (vault completo)",
	ribbonTooltip: "Slugify: renombrar archivos a slug-case (vault completo)",
	scopeVault: "todo el vault",
	menuFolder: "Slugify: renombrar archivos de esta carpeta",
	menuFile: "Slugify: renombrar este archivo",
	menuSelection: (n: number) => `Slugify: renombrar selección (${n} elementos)`,
	scopeFolder: (name: string) => `la carpeta "${name}"`,
	scopeFile: (name: string) => `"${name}"`,
	scopeSelection: (n: number) => `la selección (${n} elementos)`,
	noticeNothingToRename: (scope: string) => `Nada que renombrar en ${scope}: ya están en slug-case.`,
	modalHeading: (n: number, scope: string) => `Slugify: ${n} archivo(s) en ${scope}`,
	modalDescription:
		"Se renombrarán los siguientes archivos y se actualizarán automáticamente los enlaces que los referencian:",
	modalEditHint: "Puedes editar cualquier nombre propuesto abajo antes de confirmar.",
	buttonCancel: "Cancelar",
	buttonApply: (n: number) => `Renombrar ${n} archivo(s)`,
	noticeDoneWithSkipped: (done: number, skipped: number) =>
		`${done} archivo(s) renombrado(s), ${skipped} omitido(s) (ver consola).`,
	noticeDone: (done: number) => `${done} archivo(s) renombrado(s) correctamente.`,
	collisionNote: (n: number) =>
		`${n} elemento(s) omitido(s) por colisión de nombre con un archivo existente u otro renombrado.`,
	collisionLabel: "colisión, se omitirá",
	settingsExcludedFoldersName: "Carpetas excluidas",
	settingsExcludedFoldersDesc:
		"Los archivos dentro de estas carpetas (y sus subcarpetas) nunca se incluyen, sin importar cómo se dispare la acción. Una ruta de carpeta por línea.",
	settingsExcludedFoldersPlaceholder: "plantillas\nadjuntos/inbox",
	settingsSeparatorName: "Separador",
	settingsSeparatorDesc: "Carácter usado para sustituir espacios y otros caracteres no alfanuméricos en los nombres slugificados.",
	settingsIncludeAttachmentsName: "Incluir adjuntos",
	settingsIncludeAttachmentsDesc:
		"Renombrar también archivos que no son markdown (imágenes, PDFs, etc.), no solo notas. Los enlaces/embeds que apuntan a ellos también se actualizan.",
	undoCommandName: "Deshacer último slugify",
	noticeNothingToUndo: "Nada que deshacer: no hay ningún lote de slugify desde que se abrió Obsidian.",
	noticeUndoDone: (n: number) => `${n} archivo(s) restaurado(s) a su nombre anterior.`,
	noticeUndoDoneWithSkipped: (done: number, skipped: number) =>
		`${done} archivo(s) restaurado(s), ${skipped} omitido(s) (ver consola).`,
};
