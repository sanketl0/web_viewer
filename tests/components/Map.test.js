import Map from "../../src/components/Map";

jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
	AttributionControl: jest.fn(),
	GeolocateControl: class {
		onAdd() {;}
	},
	Marker: jest.fn(),
	Popup: class {
		on() {;}
	},
	Map: class {
		constructor(opts) {
			this._mapOpts = opts;
		}
		getContainer() {
			return this._mapOpts.container;
		}
		addControl() {;}
		addSource() {;}
		addLayer() {;}
		getLayer() {;}
		setLayoutProperty() {;}
		getStyle() {
			return {
				layers: [],
				sources: {},
				metadata: {},
			};
		}
		resize() {;}
		on(type, handler) {
			if(!this._handlers) { this._handlers = {}; }
			if(!this._handlers[type]) { this._handlers[type] = []; }
			this._handlers[type].push(handler);
		}
		_fire(type) {
			this._handlers[type].forEach(f => f());
		}
	},
}));

const createParent = () => ({
	addEventListener: jest.fn(),
	dispatchEvent: jest.fn(),
	isWidthSmall: jest.fn(),
	_options: {
		users: ["geovisio"],
	},
	_api: {
		onceReady: () => Promise.resolve(),
		getDataBbox: jest.fn(),
		getPicturesTilesUrl: jest.fn(),
		_getMapRequestTransform: jest.fn(),
		getMapStyle: () => ({ sources: {}, layers: [], metadata: {} }),
	},
	_t: {
		maplibre: {},
	}
});


describe("reloadVectorTiles", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		const setter = jest.fn();
		m.getSource = (user) => ({ tiles: [`https://bla.xyz/${user}/x/y/z`], setTiles: setter });
		m._userLayers = ["geovisio", "toto"];
		m.reloadVectorTiles();
		expect(setter.mock.calls).toMatchSnapshot();
	});
});

describe("hasTwoBackgrounds", () => {
	it("is true if 2 bg", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.getLayer = (id) => id == "gvs-aerial";
		expect(m.hasTwoBackgrounds()).toBeTruthy();
	});

	it("is false if 1 bg", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.getLayer = (id) => id == "gvs-aerial" ? undefined : {};
		expect(m.hasTwoBackgrounds()).toBeFalsy();
	});
});

describe("getBackground", () => {
	it("works if raster is enabled", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c, { raster: { type: "raster" } });
		m.getLayer = () => true;
		m.getLayoutProperty = () => "hidden";
		expect(m.getBackground()).toBe("streets");
		m.getLayoutProperty = () => "visible";
		expect(m.getBackground()).toBe("aerial");
	});

	it("works if no raster enabled", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		expect(m.getBackground()).toBe("streets");
	});
});

describe("setBackground", () => {
	it("works if raster is enabled", () => {
		const p = createParent();
		p.dispatchEvent = jest.fn();
		const c = document.createElement("div");
		const m = new Map(p, c, { raster: { type: "raster" } });
		m.setLayoutProperty = jest.fn();
		m.getLayer = () => true;
		m.setBackground("aerial");
		expect(m.setLayoutProperty.mock.calls).toMatchSnapshot();
		expect(p.dispatchEvent.mock.calls).toMatchSnapshot();
	});

	it("skips if setting streets and no raster available", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.setLayoutProperty = jest.fn();
		m.setBackground("streets");
		expect(m.setLayoutProperty.mock.calls.length).toBe(0);
	});

	it("fails if no raster available", () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		expect(() => m.setBackground("aerial")).toThrowError("No aerial imagery available");
	});
});

describe("getVisibleUsers", () => {
	it("works", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.getSource = () => true;
		m.setPaintProperty = jest.fn();
		await m._postLoad();
		m.getLayoutProperty = () => "visible";
		expect(m.getVisibleUsers()).toStrictEqual(["geovisio"]);
	});
});

describe("setVisibleUsers", () => {
	it("works when no users exists", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const m = new Map(p, c);
		m._createPicturesTilesLayer = (url, id) => m._userLayers.add(id);
		m.setLayoutProperty = jest.fn();
		await m.setVisibleUsers(["blabla"]);
		expect(m.setLayoutProperty.mock.calls).toMatchSnapshot();
		expect(p.dispatchEvent.mock.calls).toMatchSnapshot();
	});

	it("works when user already exist but is hidden", async () => {
		const p = createParent();
		p._options.users = ["blabla", "geovisio"];
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.setPaintProperty = jest.fn();
		m.getSource = () => true;
		m.getLayer = () => true;
		let cptlCount = 0;
		let deCalls = [];
		return new Promise(async (resolve) => {
			p.dispatchEvent = (e) => {
				deCalls.push(e);
				if(e.type == "map:users-changed") {
					resolve();
				}
			};
			await m._postLoad();
		}).then(() => {
			m.setLayoutProperty = jest.fn();
			m._createPicturesTilesLayer = () => { cptlCount++; return Promise.resolve(); };
			expect(m._userLayers).toEqual(new Set(["blabla", "geovisio"]));
			m.setVisibleUsers(["blabla"]);
		}).then(() => {
			expect(cptlCount).toBe(0);
			expect(deCalls).toMatchSnapshot();
			expect(m.setLayoutProperty.mock.calls).toMatchSnapshot();
		});
	});
});

describe("filterUserLayersContent", () => {
	it("works", async () => {
		const p = createParent();
		p._options.users = ["blabla", "geovisio"];
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.getSource = () => true;
		m.setPaintProperty = jest.fn();
		m.getLayer = () => true;
		await m._postLoad();
		m.setFilter = jest.fn();
		m.filterUserLayersContent("pictures", [["test", "true"]]);
		expect(m.setFilter.mock.calls).toMatchSnapshot();
	});
});

describe("reloadLayersStyles", () => {
	it("works", async () => {
		const p = createParent();
		p._options.users = ["blabla", "geovisio"];
		const c = document.createElement("div");
		const m = new Map(p, c);
		m.getSource = () => true;
		m.setPaintProperty = jest.fn();
		await m._postLoad();
		m.setLayoutProperty = jest.fn();
		m.setPaintProperty = jest.fn();
		m.reloadLayersStyles();
		expect(m.setLayoutProperty.mock.calls).toMatchSnapshot();
		expect(m.setPaintProperty.mock.calls).toMatchSnapshot();
	});
});
