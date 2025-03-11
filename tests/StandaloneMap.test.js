import StandaloneMap from "../src/StandaloneMap";

jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
}));

jest.mock("../src/components/Map", () => class {});
global.AbortSignal = { timeout: jest.fn() };

const API_URL = "http://localhost:5000/api/search";

describe("constructor", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new StandaloneMap(d, API_URL, { testing: true });
		expect(ed).toBeDefined();
	});
});

describe("destroy", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new StandaloneMap(d, API_URL, { testing: true });
		const mapDestroy = jest.fn();
		ed.map = { destroy: mapDestroy };
		ed.destroy();
		expect(mapDestroy.mock.calls).toMatchSnapshot();
		expect(ed.container.innerHTML).toBe("");
	});
});

describe("_onSelect", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new StandaloneMap(d, API_URL, { testing: true });
		ed.map = {
			queryRenderedFeatures: jest.fn(() => ({ features: [ {id: "bla"} ] })),
			_userLayers: new Set(["geovisio", "toto"]),
			_attachPreviewToPictures: jest.fn(),
		};
		ed._onSelect({ detail: { picId: "bla", seqId: "blo" } });
		expect(ed.map.queryRenderedFeatures.mock.calls).toMatchSnapshot();
		expect(ed.map._attachPreviewToPictures.mock.calls).toMatchSnapshot();
	});
});
