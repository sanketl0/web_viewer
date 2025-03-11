import Viewer from "../src/Viewer";

jest.mock("@photo-sphere-viewer/core", () => ({
	Viewer: class {},
	SYSTEM: {},
	DEFAULTS: {},
}));

jest.mock("@photo-sphere-viewer/equirectangular-tiles-adapter", () => ({
	EquirectangularTilesAdapter: jest.fn(),
}));

jest.mock("@photo-sphere-viewer/virtual-tour-plugin", () => ({
	VirtualTourPlugin: jest.fn(),
}));

jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
	Map: class {},
}));

global.AbortSignal = { timeout: jest.fn() };

const API_URL = "http://localhost:5000/api/search";


describe("constructor", () => {
	it("works", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		expect(v).toBeDefined();
	});
});

describe("destroy", () => {
	it("works", () => {
		const d = document.createElement("div");
		d.id = "geovisio";
		document.body.appendChild(d);
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure("geovisio");
		v._hash = { destroy: jest.fn() };
		v._widgets = { destroy: jest.fn() };
		v.map = { destroy: jest.fn() };
		v.psv = { destroy: jest.fn() };

		v.destroy();

		expect(v._api).toBeUndefined();
		expect(v._hash).toBeUndefined();
		expect(v.map).toBeUndefined();
		expect(v.psv).toBeUndefined();
		expect(d.innerHTML).toBe("");
	});
});

describe("_initContainerStructure", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	it("works with string", () => {
		const d = document.createElement("div");
		d.id = "geovisio";
		document.body.appendChild(d);
		const v = new Viewer("geovisio", API_URL, { testing: true });
		v._initContainerStructure();
		expect([...d.children].find(n => n.className.includes("gvs-main"))).toBeDefined();
		expect([...d.children].find(n => n.className.includes("gvs-mini"))).toBeDefined();
		expect(d.className).toBe("gvs gvs-viewer");
	});

	it("works with Element", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure();
		expect([...d.children].find(n => n.className.includes("gvs-main"))).toBeDefined();
		expect([...d.children].find(n => n.className.includes("gvs-mini"))).toBeDefined();
		expect(d.className).toBe("gvs gvs-viewer");
	});
});

describe("setPopup", () => {
	it("opens", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure();
		v.psv = {
			startKeyboardControl: jest.fn(),
			stopKeyboardControl: jest.fn(),
		};
		v.setPopup(true, "BLABLABLA");
		expect(v.popupContainer.innerHTML).toMatchSnapshot();
		expect(v.popupContainer.classList.contains("gvs-hidden")).toBeFalsy();
	});

	it("closes", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { map: false, testing: true });
		v._initContainerStructure();
		v.psv = {
			autoSize: jest.fn(),
			startKeyboardControl: jest.fn(),
			stopKeyboardControl: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.setPopup(true, "BLABLABLA");
		v.setPopup(false);
		expect(v.popupContainer.classList.contains("gvs-hidden")).toBeTruthy();
	});

	it("reopens", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure();
		v.psv = {
			autoSize: jest.fn(),
			startKeyboardControl: jest.fn(),
			stopKeyboardControl: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.setPopup(true, "BLABLABLA");
		v.setPopup(false);
		v.setPopup(true);
		expect(v.popupContainer.innerHTML).toMatchSnapshot();
		expect(v.popupContainer.classList.contains("gvs-hidden")).toBeFalsy();
	});
});

describe("playSequence", () => {
	it("sends event", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		return expect(new Promise(resolve => {
			v.addEventListener("sequence-playing", resolve);
			v.playSequence();
		})).resolves.toBeDefined();
	});
});

describe("stopSequence", () => {
	it("sends event", async () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v.psv = {
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		}
		return expect(new Promise(resolve => {
			v.addEventListener("sequence-stopped", resolve);
			v.stopSequence();
		})).resolves.toBeDefined();
	});
});

describe("isSequencePlaying", () => {
	it("is true when sequence is playing", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v.psv = { addEventListener: jest.fn() };
		v.psv.goToNextPicture = jest.fn();
		v.playSequence();
		expect(v.isSequencePlaying()).toBe(true);
	});

	it("is false when sequence never played", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v.psv = { addEventListener: jest.fn() };
		expect(v.isSequencePlaying()).toBe(false);
	});

	it("is false when sequence stopped", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v.psv = {
			addEventListener: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.playSequence();
		v.stopSequence();
		expect(v.isSequencePlaying()).toBe(false);
	});
});

describe("isMapWide", () => {
	it("works with map small", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure(d);
		v.map = {};
		expect(v.isMapWide()).toBe(false);
	});

	it("works with map wide", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure(d);
		v.map = {
			keyboard: { enable: jest.fn() },
			resize: jest.fn(),
			getCanvas: () => ({ focus: jest.fn() })
		};
		v.psv = {
			autoSize: jest.fn(),
			stopKeyboardControl: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.setFocus("map");
		expect(v.isMapWide()).toBe(true);
	});

	it("fails if no map set", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure(d);
		expect(() => v.isMapWide()).toThrow(new Error("Map is not enabled"));
	});
});

describe("setFocus", () => {
	it("changes focus from map to pic", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure(d);
		v.dispatchEvent = jest.fn();
		v.map = {
			keyboard: { enable: jest.fn(), disable: jest.fn() },
			resize: jest.fn(),
			getCanvas: () => ({ focus: jest.fn() })
		};
		v.psv = {
			autoSize: jest.fn(),
			startKeyboardControl: jest.fn(),
			stopKeyboardControl: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.setFocus("map");
		expect(v.isMapWide()).toBe(true);
	});

	it("changes focus from pic to map", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure(d);
		v.dispatchEvent = jest.fn();
		v.map = {
			keyboard: { enable: jest.fn(), disable: jest.fn() },
			resize: jest.fn(),
			getCanvas: () => ({ focus: jest.fn() })
		};
		v.psv = {
			autoSize: jest.fn(),
			startKeyboardControl: jest.fn(),
			stopKeyboardControl: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.setFocus("pic");
		expect(v.isMapWide()).toBe(false);
	});

	it("skips event", async () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v._initContainerStructure(d);
		v.dispatchEvent = jest.fn();
		v.map = {
			keyboard: { enable: jest.fn(), disable: jest.fn() },
			resize: jest.fn(),
			getCanvas: () => ({ focus: jest.fn() })
		};
		v.psv = {
			autoSize: jest.fn(),
			startKeyboardControl: jest.fn(),
			stopKeyboardControl: jest.fn(),
			adapter: { __refresh: jest.fn() },
			needsUpdate: jest.fn(),
			_myVTour: { getCurrentNode: jest.fn() },
		};
		v.setFocus("map", true);
		expect(v.dispatchEvent.mock.calls).toEqual([]);
	});

	it("fails if param is invalid", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		expect(() => v.setFocus()).toThrow(new Error("Invalid focus value (should be pic or map)"));
	});

	it("fails if no map set", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { map: false, testing: true });
		expect(() => v.setFocus("map")).toThrow(new Error("Map is not enabled"));
	});
});

describe("getPicturesNavigation", () => {
	it("works", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { picturesNavigation: "pic", testing: true });
		expect(v.getPicturesNavigation()).toBe("pic");
		v._picNav = "seq";
		expect(v.getPicturesNavigation()).toBe("seq");
	});
});

describe("setPicturesNavigation", () => {
	it("works", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		const eventWatcher = jest.fn();
		v.addEventListener("pictures-navigation-changed", eventWatcher);
		expect(v.getPicturesNavigation()).toBe("any");
		v.setPicturesNavigation("pic");
		expect(v.getPicturesNavigation()).toBe("pic");
		v.setPicturesNavigation("seq");
		expect(v.getPicturesNavigation()).toBe("seq");
		v.setPicturesNavigation("any");
		expect(v.getPicturesNavigation()).toBe("any");
		expect(eventWatcher.mock.calls).toMatchSnapshot();
	});
});

describe("setFilters", () => {
	it("works", () => {
		const d = document.createElement("div");
		const v = new Viewer(d, API_URL, { testing: true });
		v.map = {
			_userLayers: new Set(["geovisio"]),
			getZoom: jest.fn(),
			reloadLayersStyles: jest.fn(),
			filterUserLayersContent: jest.fn(),
			getVisibleUsers: () => ["geovisio"],
			_hasGridStats: () => false,
		};
		v.dispatchEvent = jest.fn();
		Date.prototype.getDate = () => 8;
		Date.prototype.setDate = jest.fn();
		Date.prototype.toISOString = () => "2023-08-09T00:00:00Z";
		v.setFilters({
			"minDate": "2023-01-01",
			"maxDate": "2023-08-08",
			"camera": "sony",
			"type": "equirectangular",
			"theme": "age",
		});
		v.setFilters({});
		expect(v._mapTheme).toBe("age");
		expect(v.dispatchEvent.mock.calls).toMatchSnapshot();
		expect(v.map.reloadLayersStyles.mock.calls).toMatchSnapshot();
		expect(v.map.filterUserLayersContent.mock.calls).toMatchSnapshot();
	});
});