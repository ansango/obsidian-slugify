import { moment } from "obsidian";
import en from "./en";
import es from "./es";

const locales = { en, es };

function detectLocale(): keyof typeof locales {
	const lang = moment.locale();
	return lang.startsWith("es") ? "es" : "en";
}

export const t = locales[detectLocale()];
