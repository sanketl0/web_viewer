import T_da from "../translations/da.json";
import T_de from "../translations/de.json";
import T_en from "../translations/en.json";
import T_eo from "../translations/eo.json";
import T_es from "../translations/es.json";
import T_fr from "../translations/fr.json";
import T_hu from "../translations/hu.json";
import T_it from "../translations/it.json";
import T_pl from "../translations/pl.json";
import T_zh_Hant from "../translations/zh_Hant.json";

const FALLBACK_LOCALE = "en";
const TRANSLATIONS = {
	"da": T_da, "de": T_de, "eo": T_eo, "en": T_en, "es": T_es, "fr": T_fr,
	"hu": T_hu, "it": T_it, "pl": T_pl, "zh_Hant": T_zh_Hant,
};

/**
 * Find best matching language regarding of list of supported languages and browser accepted languages
 * @param {str[]} supportedTranslations List of supported languages
 * @param {str} fallback The fallback language
 * @returns The best matching language
 * @private
 */
export function autoDetectLocale(supportedTranslations, fallback) { // eslint-ignore import/no-unused-modules
	for (const navigatorLang of window.navigator.languages) {
		let language = navigatorLang;
		// Convert browser code to weblate code
		switch (language) {
		case "zh-TW":
		case "zh-HK":
		case "zh-MO":
			language = "zh_Hant";
			break;
		case "zh-CN":
		case "zh-SG":
			language = "zh_Hans";
			break;
		default:
			if (language.length > 2) {
				language = navigatorLang.substring(0, 2);
			}
			break;
		}
		const pair = supportedTranslations.find((pair) => pair === language);
		if (pair) {
			return pair;
		}
	}
	return fallback;
}

/**
 * Get text labels translations in given language
 *
 * @param {string} lang The language code (fr, en)
 * @returns {object} Translations in given language, with fallback to english
 * @private
 */
export function getTranslations(lang = "") {
	const myTr = JSON.parse(JSON.stringify(T_en));
	let preferedTr;
	
	// No specific lang set -> use browser lang
	if(!lang) {
		lang = autoDetectLocale(Object.keys(TRANSLATIONS), FALLBACK_LOCALE);
	}

	// Lang exists -> send it
	if(TRANSLATIONS[lang] && lang !== "en") {
		preferedTr = TRANSLATIONS[lang];
	}

	// Look for primary lang
	if(lang.length > 2) {
		const primaryLang = lang.substring(0, 2);
		if(TRANSLATIONS[primaryLang]) { preferedTr = TRANSLATIONS[primaryLang]; }
	}

	// Merge labels to avoid missing ones
	if(preferedTr) {
		Object.entries(preferedTr).forEach(([k1, k2]) => {
			Object.entries(k2).forEach(([k2, k3]) => {
				if(Array.isArray(k3)) { k3 = k3.filter(v => v != null); }
				myTr[k1][k2] = k3;
			});
		});
	}

	return myTr;
}
