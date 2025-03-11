import URLHash from "../../src/viewer/URLHash";

describe("constructor", () => {
	it("works", () => {
		const receivedEvents = [];
		const vl = (t, h) => {
			receivedEvents.push([t, h]);
			if(t == "ready") { h(); }
		};
		const v = { addEventListener: vl };
		const uh = new URLHash(v);
		expect(uh).toBeDefined();
		expect(uh._viewer).toBe(v);
		expect(receivedEvents).toMatchSnapshot();
	});
});

describe("destroy", () => {
	it("works", () => {
		const v = {
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		};
		const uh = new URLHash(v);
		uh.destroy();
		expect(uh._viewer).toBeUndefined();
		expect(v.removeEventListener.mock.calls).toMatchSnapshot();
	});
});

describe("bindMapEvents", () => {
	it("works", () => {
		const v = { addEventListener: jest.fn(), map: { on: jest.fn() } };
		const uh = new URLHash(v);
		uh.bindMapEvents();
		expect(v.map.on.mock.calls).toMatchSnapshot();
	});
});

describe("getHashString", () => {
	it("works without any specific values set", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => null,
			},
		};
		const uh = new URLHash(v);
		expect(uh.getHashString()).toBe("#map=none");
	});

	it("works with picture metadata", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => ({ "id": "cbfc3add-8173-4464-98c8-de2a43c6a50f" })
			},
		};
		const uh = new URLHash(v);
		uh._getXyzHashString = () => "0/1/2";
		expect(uh.getHashString()).toBe("#map=none&pic=cbfc3add-8173-4464-98c8-de2a43c6a50f&xyz=0/1/2");
	});

	it("works with map started + wide", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => null,
			},
			map: {
				getVisibleUsers: () => ["geovisio"],
				hasTwoBackgrounds: () => false,
			},
			isMapWide: () => true,
			popupContainer: { classList: { contains: () => true } },
		};
		const uh = new URLHash(v);
		uh._getMapHashString = () => "18/0.5/-12";
		expect(uh.getHashString()).toBe("#focus=map&map=18/0.5/-12");
	});

	it("works with map + picture wide", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => ({ "id": "cbfc3add-8173-4464-98c8-de2a43c6a50f" }),
			},
			map: {
				getVisibleUsers: () => ["geovisio"],
				hasTwoBackgrounds: () => false,
			},
			isMapWide: () => false,
			popupContainer: { classList: { contains: () => true } },
		};
		const uh = new URLHash(v);
		uh._getXyzHashString = () => "0/1/2";
		uh._getMapHashString = () => "18/0.5/-12";
		expect(uh.getHashString()).toBe("#focus=pic&map=18/0.5/-12&pic=cbfc3add-8173-4464-98c8-de2a43c6a50f&xyz=0/1/2");
	});

	it("works with map filters", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => null,
			},
			map: {
				getVisibleUsers: () => ["geovisio"],
				hasTwoBackgrounds: () => false,
			},
			isMapWide: () => false,
			popupContainer: { classList: { contains: () => true } },
			_mapFilters: {
				"minDate": "2023-01-01",
				"maxDate": "2023-08-08",
				"camera": "sony",
				"type": "flat",
				"theme": "age",
			},
		};
		const uh = new URLHash(v);
		uh._getMapHashString = () => "18/0.5/-12";
		expect(uh.getHashString()).toBe("#camera=sony&date_from=2023-01-01&date_to=2023-08-08&focus=pic&map=18/0.5/-12&pic_type=flat&theme=age");
	});

	it("works with speed", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => 250,
				getPictureMetadata: () => null,
			},
		};
		const uh = new URLHash(v);
		expect(uh.getHashString()).toBe("#map=none&speed=250");
	});

	it("works with popup", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => null,
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => null,
			},
			map: {
				getVisibleUsers: () => ["geovisio"],
				hasTwoBackgrounds: () => false,
			},
			isMapWide: () => false,
			popupContainer: { classList: { contains: () => false } },
		};
		const uh = new URLHash(v);
		uh._getMapHashString = () => "18/0.5/-12";
		expect(uh.getHashString()).toBe("#focus=meta&map=18/0.5/-12");
	});

	it("works with nav", () => {
		const v = {
			addEventListener: jest.fn(),
			getPicturesNavigation: () => "pic",
			psv: {
				getTransitionDuration: () => null,
				getPictureMetadata: () => null,
			},
		};
		const uh = new URLHash(v);
		expect(uh.getHashString()).toBe("#map=none&nav=pic");
	});
});

describe("_getCurrentHash", () => {
	it("works if empty", () => {
		delete window.location;
		window.location = { hash: "" };
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh._getCurrentHash()).toStrictEqual({});
	});

	it("works with single param", () => {
		delete window.location;
		window.location = { hash: "#a=b" };
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh._getCurrentHash()).toStrictEqual({"a": "b"});
	});

	it("works with multiple params", () => {
		delete window.location;
		window.location = { hash: "#a=b&c=d" };
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh._getCurrentHash()).toStrictEqual({"a": "b", "c": "d"});
	});
});

describe("_getMapHashString", () => {
	it("works with zoom+center", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				getZoom: () => 18,
				getCenter: () => ({ lng: -12.5, lat: 48.75 }),
				getBearing: () => null,
				getPitch: () => null,
			}
		};
		const uh = new URLHash(v);
		expect(uh._getMapHashString()).toBe("18/48.75/-12.5");
	});

	it("works with zoom+center+bearing", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				getZoom: () => 18,
				getCenter: () => ({ lng: -12.5, lat: 48.75 }),
				getBearing: () => 12,
				getPitch: () => null,
			}
		};
		const uh = new URLHash(v);
		expect(uh._getMapHashString()).toBe("18/48.75/-12.5/12");
	});

	it("works with zoom+center+pitch", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				getZoom: () => 18,
				getCenter: () => ({ lng: -12.5, lat: 48.75 }),
				getBearing: () => null,
				getPitch: () => 65,
			},
		};
		const uh = new URLHash(v);
		expect(uh._getMapHashString()).toBe("18/48.75/-12.5/0/65");
	});

	it("works with zoom+center+bearing+pitch", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				getZoom: () => 18,
				getCenter: () => ({ lng: -12.5, lat: 48.75 }),
				getBearing: () => 42,
				getPitch: () => 65,
			},
		};
		const uh = new URLHash(v);
		expect(uh._getMapHashString()).toBe("18/48.75/-12.5/42/65");
	});
});

describe("_getXyzHashString", () => {
	it("works", () => {
		const v = {
			addEventListener: jest.fn(),
			psv: {
				getXYZ: () => ({ x: 12, y: 50, z: 75 }),
			},
		};
		const uh = new URLHash(v);
		expect(uh._getXyzHashString()).toBe("12.00/50.00/75");
	});

	it("rounds to 2 decimals", () => {
		const v = {
			addEventListener: jest.fn(),
			psv: {
				getXYZ: () => ({ x: 12.123456, y: 50.789456, z: 75 }),
			},
		};
		const uh = new URLHash(v);
		expect(uh._getXyzHashString()).toBe("12.12/50.79/75");
	});

	it("works without z", () => {
		const v = {
			addEventListener: jest.fn(),
			psv: {
				getXYZ: () => ({ x: 12, y: 50 }),
			},
		};
		const uh = new URLHash(v);
		expect(uh._getXyzHashString()).toBe("12.00/50.00/0");
	});
});

describe("_onHashChange", () => {
	global.console = { warn: jest.fn() };

	it("works", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				dragRotate: { isEnabled: () => false },
				getBearing: jest.fn(),
				jumpTo: jest.fn(),
				setVisibleUsers: jest.fn(),
				setBackground: jest.fn(),
			},
			psv: {
				setTransitionDuration: jest.fn(),
				setXYZ: jest.fn(),
			},
			select: jest.fn(),
			setFocus: jest.fn(),
			setFilters: jest.fn(),
			setPopup: jest.fn(),
		};
		const uh = new URLHash(v);
		uh._getCurrentHash = () => ({
			pic: "cbfc3add-8173-4464-98c8-de2a43c6a50f",
			focus: "map",
			xyz: "1/2/3",
			map: "15/48.7/-12.5",
			speed: "300",
		});
		uh._onHashChange();

		expect(v.select.mock.calls).toEqual([[null, "cbfc3add-8173-4464-98c8-de2a43c6a50f"]]);
		expect(v.setFocus.mock.calls).toEqual([["map"]]);
		expect(v.map.jumpTo.mock.calls).toEqual([[{ center: [-12.5, 48.7], zoom: 15, pitch: 0 }]]);
		expect(v.psv.setXYZ.mock.calls).toEqual([[1, 2, 3]]);
		expect(v.psv.setTransitionDuration.mock.calls).toEqual([["300"]]);
	});

	it("doesnt call map if no map params", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				jumpTo: jest.fn(),
				setBackground: jest.fn(),
			},
			psv: {
				setTransitionDuration: jest.fn(),
				setXYZ: jest.fn(),
			},
			select: jest.fn(),
			setFocus: jest.fn(),
			setFilters: jest.fn(),
		};
		const uh = new URLHash(v);
		uh._getCurrentHash = () => ({
			pic: "cbfc3add-8173-4464-98c8-de2a43c6a50f",
			xyz: "1/2/3",
		});
		uh._onHashChange();

		expect(v.select.mock.calls).toEqual([[null, "cbfc3add-8173-4464-98c8-de2a43c6a50f"]]);
		expect(v.setFocus.mock.calls.length).toBe(0);
		expect(v.map.jumpTo.mock.calls.length).toBe(0);
		expect(v.map.setBackground.mock.calls.length).toBe(0);
		expect(v.psv.setXYZ.mock.calls).toEqual([[1, 2, 3]]);
	});

	it("doesnt call psv if no related params", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				dragRotate: { isEnabled: () => false },
				getBearing: jest.fn(),
				jumpTo: jest.fn(),
				setVisibleUsers: jest.fn(),
				setBackground: jest.fn(),
			},
			psv: {
				setTransitionDuration: jest.fn(),
				setXYZ: jest.fn(),
			},
			select: jest.fn(),
			setFocus: jest.fn(),
			setFilters: jest.fn(),
			setPopup: jest.fn(),
		};
		const uh = new URLHash(v);
		uh._getCurrentHash = () => ({
			focus: "map",
			map: "15/48.7/-12.5"
		});
		uh._onHashChange();

		expect(v.select.mock.calls).toEqual([[]]);
		expect(v.setFocus.mock.calls).toEqual([["map"]]);
		expect(v.map.jumpTo.mock.calls).toEqual([[{ center: [-12.5, 48.7], zoom: 15, pitch: 0 }]]);
		expect(v.psv.setXYZ.mock.calls.length).toEqual(0);
	});

	it("handles multiple picture IDs", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				dragRotate: { isEnabled: () => false },
				getBearing: jest.fn(),
				jumpTo: jest.fn(),
				setVisibleUsers: jest.fn(),
				setBackground: jest.fn(),
			},
			psv: {
				setTransitionDuration: jest.fn(),
				setXYZ: jest.fn(),
			},
			select: jest.fn(),
			setFocus: jest.fn(),
			setFilters: jest.fn(),
			setPopup: jest.fn(),
		};
		const uh = new URLHash(v);
		uh._getCurrentHash = () => ({
			pic: "cbfc3add-8173-4464-98c8-de2a43c6a50f;blablabla-8173-4464-98c8-de2a43c6a50f",
			focus: "map",
			xyz: "1/2/3",
			map: "15/48.7/-12.5",
			speed: "300",
		});
		uh._onHashChange();

		expect(v.select.mock.calls).toEqual([[null, "cbfc3add-8173-4464-98c8-de2a43c6a50f"]]);
		expect(v.setFocus.mock.calls).toEqual([["map"]]);
		expect(v.map.jumpTo.mock.calls).toEqual([[{ center: [-12.5, 48.7], zoom: 15, pitch: 0 }]]);
		expect(v.psv.setXYZ.mock.calls).toEqual([[1, 2, 3]]);
		expect(v.psv.setTransitionDuration.mock.calls).toEqual([["300"]]);
	});
});

describe("getMapFiltersFromHashVals", () => {
	it("works", () => {
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		const vals = {
			"date_from": "2023-01-01",
			"date_to": "2023-05-05",
			"pic_type": "equirectangular",
			"camera": "sony",
			"whatever": "whenever",
			"theme": "type",
		};
		expect(uh.getMapFiltersFromHashVals(vals)).toEqual({
			"minDate": "2023-01-01",
			"maxDate": "2023-05-05",
			"type": "equirectangular",
			"camera": "sony",
			"theme": "type",
		});
	});
});

describe("getMapOptionsFromHashString", () => {
	it("works without map", () => {
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh.getMapOptionsFromHashString("18/-12.5/48.7")).toEqual({ center: [48.7, -12.5], zoom: 18, pitch: 0 });
	});

	it("works with map", () => {
		const v = {
			addEventListener: jest.fn(),
			map: {
				dragRotate: { isEnabled: () => true },
				touchZoomRotate: { isEnabled: () => true },
			},
		};
		const uh = new URLHash(v);
		expect(uh.getMapOptionsFromHashString("18/-12.5/48.7/15/12")).toEqual({ center: [48.7, -12.5], zoom: 18, pitch: 12, bearing: 15 });
	});

	it("nulls if string is invalid", () => {
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh.getMapOptionsFromHashString("bla/bla/bla")).toBeNull();
	});
});

describe("getXyzOptionsFromHashString", () => {
	it("works", () => {
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh.getXyzOptionsFromHashString("18/-12.5/48.7")).toEqual({ x: 18, y: -12.5, z: 48.7 });
	});

	it("nulls if string is invalid", () => {
		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		expect(uh.getXyzOptionsFromHashString("bla/bla/bla")).toBeNull();
	});
});

describe("_updateHash", () => {
	it("works", async () => {
		delete window.history;
		delete window.location;

		window.history = { replaceState: jest.fn(), state: {} };
		window.location = { href: "http://localhost:5000/#a=b&b=c", hash: "#a=b&b=c" };

		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		uh.getHashString = () => "#c=d";
		uh.dispatchEvent = jest.fn();

		uh._updateHash();
		await new Promise((r) => setTimeout(r, 1000));

		expect(window.history.replaceState.mock.calls.pop()).toEqual([{}, null, "http://localhost:5000/#c=d"]);
		expect(uh.dispatchEvent.mock.calls).toMatchSnapshot();
	});

	it("works with pic change", async () => {
		delete window.history;
		delete window.location;

		window.history = { pushState: jest.fn(), state: {} };
		window.location = { href: "http://localhost:5000/#a=b&b=c", hash: "#a=b&pic=bla" };

		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		uh.getHashString = () => "#c=d";
		uh.dispatchEvent = jest.fn();

		uh._updateHash();
		await new Promise((r) => setTimeout(r, 1000));

		expect(window.history.pushState.mock.calls.pop()).toEqual([{}, null, "http://localhost:5000/#c=d"]);
		expect(uh.dispatchEvent.mock.calls).toMatchSnapshot();
	});

	it("deduplicates calls", async () => {
		delete window.history;
		delete window.location;

		window.history = { replaceState: jest.fn(), state: {} };
		window.location = { href: "http://localhost:5000/#a=b&b=c", hash: "#a=b&b=c" };

		const v = { addEventListener: jest.fn() };
		const uh = new URLHash(v);
		uh.getHashString = () => "#c=d";

		for(let i=0; i <= 10; i++) {
			uh._updateHash();
		}

		await new Promise((r) => setTimeout(r, 1000));

		expect(window.history.replaceState.mock.calls).toEqual([[{}, null, "http://localhost:5000/#c=d"]]);
	});
});
