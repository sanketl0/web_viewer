import Photo from "../../src/components/Photo";
import fs from "fs";
import path from "path";

jest.mock("@photo-sphere-viewer/core", () => ({
	Viewer: class {
		constructor(opts) {
			this._psvOpts = opts;
			this.loader = {
				canvas: { setAttribute: jest.fn() },
				__updateContent: jest.fn(),
				show: jest.fn(),
			};
			this.renderer = {
				renderer: {
					toneMapping: null,
					toneMappingExposure: null,
				}
			};
		}
		addEventListener() {;}
		getPlugin() {
			return {
				addEventListener: jest.fn(),
				datasource: {
					nodeResolver: jest.fn(),
				},
				arrowsRenderer: {
					clear: jest.fn(),
				},
				state: {
					currentNode: null,
					datasource: { nodes: {} },
				},
				config: {
					transitionOptions: jest.fn(),
				},
				__onEnterObject: jest.fn(),
				__onLeaveObject: jest.fn(),
			};
		}
	}
}));

jest.mock("@photo-sphere-viewer/equirectangular-tiles-adapter", () => ({
	EquirectangularTilesAdapter: jest.fn(),
}));

jest.mock("@photo-sphere-viewer/virtual-tour-plugin", () => ({
	VirtualTourPlugin: jest.fn(),
}));

const createParent = () => ({
	addEventListener: jest.fn(),
	dispatchEvent: jest.fn(),
	isWidthSmall: jest.fn(),
	select: jest.fn(),
	_t: { gvs: {} },
	_api: {
		_getFetchOptions: jest.fn(),
		getPictureMetadataUrl: (picId, seqId) => `https://geovisio.fr/api/collections/${seqId}/items/${picId}`
	},
});


describe("constructor", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		expect(c.className).toBe("gvs-psv");
	});
});

describe("_getNodeFromAPI", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("works", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "Viewer_pictures_1.json")))),
			})
		);
		global.Date = jest.fn(() => ({ toLocaleDateString: () => "June 3 2022" }));
		const res = await ph._getNodeFromAPI("id");
		expect(res).toMatchSnapshot();
	});

	it("works with nav filter", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		p._picturesNavFilter = () => false;
		global.fetch = jest.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "Viewer_pictures_1.json")))),
			})
		);
		global.Date = jest.fn(() => ({ toLocaleDateString: () => "June 3 2022" }));
		const res = await ph._getNodeFromAPI("id");
		expect(res).toMatchSnapshot();
	});
});

describe("getPictureMetadata", () => {
	it("works when pic is selected", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour.state.currentNode = { bla: "bla" };
		expect(ph.getPictureMetadata()).toStrictEqual({ bla: "bla" });
	});

	it("nulls when no pic is selected", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		expect(ph.getPictureMetadata()).toBeNull();
	});
});

describe("_onSelect", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { setCurrentNode: jest.fn(() => Promise.resolve()), getCurrentNode: jest.fn() };
		ph._onSelect({ detail: { picId: "id" } });
		expect(ph._myVTour.setCurrentNode.mock.calls).toEqual([["id"]]);
	});

	it("works on pic ID already used", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { setCurrentNode: jest.fn(() => Promise.resolve()), getCurrentNode: () => "id" };
		ph._onSelect({ detail: { picId: "id" } });
		expect(ph._myVTour.setCurrentNode.mock.calls).toEqual([["id"]]);
	});
});

describe("goToNextPicture", () => {
	it("fails if no current picture", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { state: { currentNode: undefined } };
		expect(() => ph.goToNextPicture()).toThrow(new Error("No picture currently selected"));
	});

	it("works if next pic exists", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { state: { currentNode: { sequence: { id: "seq", nextPic: "idnext" } } } };
		ph.goToNextPicture();
		expect(p.select.mock.calls).toEqual([["seq", "idnext"]]);
	});

	it("fails if no next picture", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { state: { currentNode: { sequence: {} } } };
		expect(() => ph.goToNextPicture()).toThrow(new Error("No next picture available"));
	});
});

describe("goToPrevPicture", () => {
	it("fails if no current picture", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { state: { currentNode: undefined } };
		expect(() => ph.goToPrevPicture()).toThrow(new Error("No picture currently selected"));
	});

	it("works if next pic exists", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { state: { currentNode: { sequence: { id: "seq", prevPic: "idprev" } } } };
		ph.goToPrevPicture();
		expect(p.select.mock.calls).toEqual([["seq", "idprev"]]);
	});

	it("fails if no next picture", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour = { state: { currentNode: { sequence: {} } } };
		expect(() => ph.goToPrevPicture()).toThrow(new Error("No previous picture available"));
	});
});

describe("goToPosition", () => {
	it("works", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		p._api = {
			getPicturesAroundCoordinates: () => Promise.resolve(JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "Viewer_pictures_1.json")))),
			_getFetchOptions: jest.fn()
		};

		const res = await ph.goToPosition(48.7, -1.8);

		expect(res).toEqual("0005086d-65eb-4a90-9764-86b3661aaa77");
		expect(p.select.mock.calls).toEqual([["bb129602-5ac1-4512-bf67-9ec1fa23033f", "0005086d-65eb-4a90-9764-86b3661aaa77"]]);
	});

	it("handles empty result from API", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		p._api = {
			getPicturesAroundCoordinates: () => Promise.resolve({ "features": [] }),
			_getFetchOptions: jest.fn()
		};
		return expect(ph.goToPosition()).rejects.toStrictEqual(new Error("No picture found nearby given coordinates"));
	});
});

describe("getXY", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph.getPosition = () => ({ yaw: 0.7853981634, pitch: -1.2217304764 });
		expect(ph.getXY()).toEqual({ x: 45.0000000001462, y: -70.00000000022743 });
	});
});

describe("getXYZ", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph.getPosition = () => ({ yaw: 0.7853981634, pitch: -1.2217304764 });
		ph.getZoomLevel = () => 15;
		expect(ph.getXYZ()).toEqual({ x: 45.0000000001462, y: -70.00000000022743, z: 15 });
	});
});

describe("clearPictureMetadataCache", () => {
	it("works when no pic is selected", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		await ph.clearPictureMetadataCache();
		expect(ph._myVTour.state.currentNode).toBeNull();
		expect(ph._myVTour.state.datasource.nodes).toStrictEqual({});
	});

	it("works when a pic is selected", async () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph._myVTour.state.currentNode = { id: "pic", sequence: { id: "seq" } };
		await ph.clearPictureMetadataCache();
		expect(p.select.mock.calls).toMatchSnapshot();
	});
});

describe("setXYZ", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph.rotate = jest.fn();
		ph.zoom = jest.fn();
		ph.setXYZ(45, -45, 3);
		expect(ph.zoom.mock.calls).toEqual([[3]]);
		expect(ph.rotate.mock.calls).toEqual([[{ yaw: 0.7853981633974483, pitch: -0.7853981633974483 }]]);
	});
});

describe("setHigherContrast", () => {
	it("works on enable", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph.needsUpdate = jest.fn();
		ph.setHigherContrast(true);
		expect(ph.renderer.renderer.toneMapping).toBe(3);
		expect(ph.renderer.renderer.toneMappingExposure).toBe(2);
		expect(ph.needsUpdate.mock.calls.length).toBe(1);
	});

	it("works on disable", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph.needsUpdate = jest.fn();
		ph.setHigherContrast(false);
		expect(ph.renderer.renderer.toneMapping).toBe(0);
		expect(ph.renderer.renderer.toneMappingExposure).toBe(1);
		expect(ph.needsUpdate.mock.calls.length).toBe(1);
	});
});

describe("getTransitionDuration", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c, { transitionDuration: 42 });
		expect(ph.getTransitionDuration()).toBe(42);
	});
});

describe("setTransitionDuration", () => {
	it("works", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		ph.setTransitionDuration(1024);
		expect(ph.getTransitionDuration()).toBe(1024);
		expect(p.dispatchEvent.mock.calls).toMatchSnapshot();
	});

	it("fails when value is invalid", () => {
		const p = createParent();
		const c = document.createElement("div");
		const ph = new Photo(p, c);
		expect(() => ph.setTransitionDuration(-1)).toThrowError("Invalid transition duration (should be between 100 and 3000)");
		expect(() => ph.setTransitionDuration(3001)).toThrowError("Invalid transition duration (should be between 100 and 3000)");
	});
});
