import Editor from "../src/Editor";

jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
}));

jest.mock("@photo-sphere-viewer/core", () => ({
	SYSTEM: {},
}));

jest.mock("../src/components/Photo", () => class {
	constructor() {
		this._myVTour = { datasource: {} };
		this._api = {
			onceReady: () => Promise.resolves(),
		};
	}
});

jest.mock("../src/components/Map", () => class {});
global.AbortSignal = { timeout: jest.fn() };

const API_URL = "http://localhost:5000/api/search";

describe("constructor", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		expect(ed).toBeDefined();
	});

	it("fails if no sequence is selected", () => {
		global.console = { error: jest.fn() };
		const d = document.createElement("div");
		expect(() => new Editor(d, API_URL, { testing: true })).toThrow("No sequence is selected");
	});
});

describe("_createMapStyle", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		expect(ed._createMapStyle()).toMatchSnapshot();
	});
});

describe("_bindPicturesEvents", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		ed.map = { on: jest.fn(), _onPictureClick: jest.fn() };
		ed._bindPicturesEvents();
		expect(ed.map.on.mock.calls).toMatchSnapshot();
	});
});

describe("_getNode", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		ed._sequenceData = [
			{
				assets: { pic: { roles: ["visual"], type: "image/jpeg", href: "1.jpg" } },
				links: [],
				properties: { id: "1" },
				geometry: { coordinates: [0,0] }
			},
			{
				assets: { pic: { roles: ["visual"], type: "image/jpeg", href: "2.jpg" } },
				links: [],
				properties: { id: "2" },
				geometry: { coordinates: [0.1,0.1] }
			},
		];
		expect(ed._getNode("2")).toMatchSnapshot();
	});
});

describe("_addMapBackgroundWidget", () => {
	it("works", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		ed.map = { getBackground: jest.fn() };
		ed._addMapBackgroundWidget();
		expect(ed.mapContainer).toMatchSnapshot();
	});
});

describe("previewSequenceHeadingChange", () => {
	it("works when setting preview", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		ed.psv = { getPictureRelativeHeading: () => 12 };
		ed.map = {
			getLayer: () => undefined,
			addLayer: jest.fn(),
			setLayoutProperty: jest.fn(),
			setFilter: jest.fn(),
			_picMarker: { setRotation: jest.fn() },
			_picMarkerPreview: { remove: jest.fn() },
		};
		ed.previewSequenceHeadingChange(10);
		expect(ed.map.addLayer.mock.calls).toMatchSnapshot();
		expect(ed.map.setLayoutProperty.mock.calls).toMatchSnapshot();
		expect(ed.map.setFilter.mock.calls).toMatchSnapshot();
	});

	it("works when unsetting", () => {
		const d = document.createElement("div");
		const ed = new Editor(d, API_URL, { testing: true, selectedSequence: "bla" });
		ed.psv = { getPictureRelativeHeading: () => 12 };
		ed.map = {
			getLayer: () => true,
			addLayer: jest.fn(),
			setLayoutProperty: jest.fn(),
			setFilter: jest.fn(),
			_picMarker: { setRotation: jest.fn() },
			_picMarkerPreview: { remove: jest.fn() },
		};
		ed.previewSequenceHeadingChange(10);
		ed.previewSequenceHeadingChange();
		expect(ed.map.addLayer.mock.calls).toMatchSnapshot();
		expect(ed.map.setLayoutProperty.mock.calls).toMatchSnapshot();
		expect(ed.map.setFilter.mock.calls).toMatchSnapshot();
	});
});
