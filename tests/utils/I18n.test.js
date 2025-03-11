import { autoDetectLocale, getTranslations } from "../../src/utils/I18n";

describe("autoDetectLocale", () => {
    // Mock the window.navigator.languages
    const originalNavigatorLanguages = window.navigator.languages;

    afterEach(() => {
        // Reset window.navigator.languages after each test
        Object.defineProperty(window.navigator, "languages", {
            value: originalNavigatorLanguages,
            configurable: true
        });
    });

    it("returns matched language from supportedTranslations", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["fr-FR", "en-US"],
            configurable: true
        });
        const supportedTranslations = ["en", "fr", "es"];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("fr");
    });

    it("returns fallback when no match is found", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["de-DE", "it-IT"],
            configurable: true
        });
        const supportedTranslations = ["en", "fr", "es"];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("en");
    });

    it("returns zh_Hant for Chinese Traditional locales", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["zh-TW"],
            configurable: true
        });
        const supportedTranslations = ["zh_Hant", "zh_Hans", "en"];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("zh_Hant");
    });

    it("returns zh_Hans for Chinese Simplified locales", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["zh-CN"],
            configurable: true
        });
        const supportedTranslations = ["zh_Hant", "zh_Hans", "en"];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("zh_Hans");
    });

    it("returns first matched language even when navigator language has region", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["fr-CA", "en-US"],
            configurable: true
        });
        const supportedTranslations = ["fr", "en"];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("fr");
    });

    it("returns fallback when supportedTranslations is empty", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["fr-FR"],
            configurable: true
        });
        const supportedTranslations = [];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("en");
    });

    it("handles language codes with more than two characters", () => {
        Object.defineProperty(window.navigator, "languages", {
            value: ["pt-BR", "en-US"],
            configurable: true
        });
        const supportedTranslations = ["pt", "en"];
        const fallback = "en";
        expect(autoDetectLocale(supportedTranslations, fallback)).toBe("pt");
    });
});

describe("getTranslations", () => {
	it("works with default lang", () => {
		const res = getTranslations("en");
		expect(res.map.loading).toBe("Loading…");
	});

	it("works with existing lang", () => {
		const res = getTranslations("fr");
		expect(res.map.loading).toBe("Chargement…");
	});

	it("fallbacks to English if lang not found", () => {
		const res = getTranslations("xn");
		expect(res.map.loading).toBe("Loading…");
	});

	it("fallbacks to English if lang is undefined", () => {
		const res = getTranslations();
		expect(res.map.loading).toBe("Loading…");
	});

	it("works when primary lang code exists", () => {
		const res = getTranslations("fr_FR");
		expect(res.map.loading).toBe("Chargement…");
	});
});
