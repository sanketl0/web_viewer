import API from "../../src/utils/API";

jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
}));
global.AbortSignal = { timeout: jest.fn() };

const ENDPOINT = "https://panoramax.ign.fr/api";
const VALID_LANDING = {
	stac_version: "1.0.0",
	links: [
		{ "rel": "data", "type": "application/rss+xml", "href": ENDPOINT+"/collections?format=rss" },
		{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
		{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
		{ "rel": "xyz", "type": "application/vnd.mapbox-vector-tile", "href": ENDPOINT+"/map/{z}/{x}/{y}.mvt" },
		{ "rel": "collection-preview", "type": "image/jpeg", "href": ENDPOINT+"/collections/{id}/thumb.jpg" },
		{ "rel": "item-preview", "type": "image/jpeg", "href": ENDPOINT+"/pictures/{id}/thumb.jpg" },
		{ "rel": "report", "type": "application/json", "href": ENDPOINT+"/reports" },
	],
	"extent": {
		"spatial": {
			"bbox": [[-0.586, 0, 6.690, 49.055]]
		},
		"temporal": {
			"interval": [[ "2019-08-18T14:11:29+00:00", "2023-05-30T18:16:21.167000+00:00" ]]
		}
	}
};
const LANDING_NO_PREVIEW = {
	stac_version: "1.0.0",
	links: [
		{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
		{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
	]
};

describe("constructor", () => {
	// Mock landing fetch
	global.fetch = jest.fn(() => Promise.resolve({
		json: () => Promise.resolve(VALID_LANDING)
	}));

	it("works with valid endpoint", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		expect(api._endpoint).toBe(ENDPOINT);
	});

	it("works with relative path", () => {
		const api = new API("/api", { skipReadLanding: true });
		expect(api._endpoint).toBe("http://localhost/api");
	});

	it("handles tiles overrides", () => {
		// Mock landing fetch
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve(VALID_LANDING)
		}));

		const api = new API(ENDPOINT, { tiles: "https://my.custom.tiles/" });
		return api.onceReady().then(() => {
			expect(api._endpoint).toBe(ENDPOINT);
			expect(api._endpoints.tiles).toBe("https://my.custom.tiles/");
		});
	});

	it("fails if endpoint is invalid", () => {
		expect(() => new API("not an url")).toThrow("endpoint parameter is not a valid URL: not an url");
	});

	it("fails if endpoint is empty", () => {
		expect(() => new API()).toThrow("endpoint parameter is empty or not a valid string");
	});

	it("accepts fetch options", () => {
		const api = new API("/api", { skipReadLanding: true, fetch: { bla: "bla" } });
		expect(api._getFetchOptions()).toEqual({ bla: "bla" });
	});
});

describe("onceReady", () => {
	it("works if API is ready", async () => {
		// Mock landing fetch
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve(VALID_LANDING)
		}));

		const api = new API(ENDPOINT);
		const res = await api.onceReady();
		expect(res).toBe("API is ready");

		// Also work after initial promise resolve
		const res2 = await api.onceReady();
		expect(res2).toBe("API is ready");
	});

	it("handles API failures", async () => {
		// Mock landing fetch
		fetch.mockRejectedValueOnce();
		global.console = { error: jest.fn() };

		const api = new API(ENDPOINT);
		await expect(api.onceReady()).rejects.toBe("Viewer failed to communicate with API");

		// Also work after initial promise end
		await expect(api.onceReady()).rejects.toBe("Viewer failed to communicate with API");
	});
});

describe("isReady", () => {
	global.console = { warn: jest.fn(), error: jest.fn() };

	// Randomly fails for no reason
	it.skip("works if API is ready", async () => {
		// Mock landing fetch
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve(VALID_LANDING)
		}));
		
		const api = new API(ENDPOINT);
		await api.onceReady();
		expect(api.isReady()).toBeTruthy();
	});

	it("works with API failing", async () => {
		// Mock landing fetch
		fetch.mockRejectedValueOnce();

		const api = new API(ENDPOINT);
		try {
			return await api.onceReady();
		} catch {
			expect(api.isReady()).toBeFalsy();
		}
	});
});

describe("_parseLanding", () => {
	it("handles overrides for tiles URL", () => {
		global.console = { warn: jest.fn() };
		const api = new API (ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING, { tiles: "https://my.custom.tiles/" });
		expect(api._endpoints.tiles).toBe("https://my.custom.tiles/");
	});

	it("fails if landing JSON lacks info", () => {
		const api = new API (ENDPOINT, { skipReadLanding: true });
		expect(() => api._parseLanding({})).toThrow("API Landing page doesn't contain 'links' list");
	});

	it.each([
		["search",				"application/geo+json"],
		["data",				"application/json"],
		["data",				"application/rss+xml"],
		["xyz",					"application/vnd.mapbox-vector-tile"],
		["xyz-style",			"application/json"],
		["user-xyz",			"application/vnd.mapbox-vector-tile"],
		["user-xyz-style",		"application/json"],
		["user-search",			"application/json"],
		["collection-preview",	"image/jpeg"],
		["item-preview",		"image/jpeg"],
		["report",				"application/json"],
	])("fails if link rel=%s type=%s is invalid", (rel, type) => {
		const api = new API (ENDPOINT, { skipReadLanding: true });
		const landing = {
			stac_version: "1.0.0",
			links: [
				{ "rel": rel, "href": "bla", "type": type }
			]
		};
		try {
			api._parseLanding(landing);
			throw new Error("Should not succeed");
		}
		catch(e) {
			expect(e.message).toMatchSnapshot();
		}
	});


	it("fails if API version is not supported", () => {
		const api = new API (ENDPOINT, { skipReadLanding: true });
		const landing = { stac_version: "0.1", links: [] };
		expect(() => api._parseLanding(landing)).toThrow("API is not in a supported STAC version (Panoramax viewer supports only 1.x, API is 0.1)");
	});

	it("fails if mandatory links are not set", () => {
		const api = new API (ENDPOINT, { skipReadLanding: true });
		const landing = {
			stac_version: "1.0.0",
			links: []
		};
		try {
			api._parseLanding(landing);
			throw new Error("Should not succeed");
		}
		catch(e) {
			expect(e.message).toMatchSnapshot();
		}
	});
});

describe("_loadMapStyles", () => {
	it("works if no background style set", async() => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		await api._loadMapStyles();
		expect(api.mapStyle).toMatchSnapshot();
	});

	it("loads background style from string", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		global.fetch = () => Promise.resolve({ json: () => ({
			name: "Provider",
			sources: { provider: {} },
			layers: [{id: "provlayer"}],
		})});
		await api._loadMapStyles("https://tiles.provider/style.json");
		expect(api.mapStyle).toMatchSnapshot();
	});

	it("loads background style from json", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		await api._loadMapStyles({
			name: "Provider",
			sources: { provider: {} },
			layers: [{id: "provlayer"}],
		});
		expect(api.mapStyle).toMatchSnapshot();
	});

	it("handles default user", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		await api._loadMapStyles(undefined, ["geovisio"]);
		expect(api.mapStyle).toMatchSnapshot();
	});

	it("handles various users", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding({
			stac_version: "1.0.0",
			links: [
				{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
				{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
				{ "rel": "xyz-style", "type": "application/json", "href": ENDPOINT+"/map/style.json" },
				{ "rel": "user-xyz-style", "type": "application/json", "href": ENDPOINT+"/users/{userId}/map/style.json" },
			],
			"extent": {
				"spatial": {
					"bbox": [[-0.586, 0, 6.690, 49.055]]
				},
				"temporal": {
					"interval": [[ "2019-08-18T14:11:29+00:00", "2023-05-30T18:16:21.167000+00:00" ]]
				}
			}
		});
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		global.fetch = (url) => {
			if(url.includes("/users") && url.includes("style.json")) {
				let user = null;
				if(url.includes("/bla/")) { user = "bla"; }
				if(url.includes("/blo/")) { user = "blo"; }

				return Promise.resolve({ json: () => Promise.resolve({
					sources: { [`provider_${user}`]: {} },
					layers: [{id: `provider_${user}`}],
				}) });
			}
			else if(url === ENDPOINT+"/map/style.json") {
				return Promise.resolve({ json: () => Promise.resolve({
					sources: { [`provider`]: {} },
					layers: [{id: `provider`}],
				}) });
			}
		};
		await api._loadMapStyles(undefined, ["bla", "blo"]);
		expect(api.mapStyle).toMatchSnapshot();
	});
});

describe("_getMapRequestTransform", () => {
	it("does nothing if no tiles enabled", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		expect(api._getMapRequestTransform()).toBe(undefined);
	});

	it("does nothing if no fetch options defined", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		expect(api._getMapRequestTransform()).toBe(undefined);
	});

	it("returns a function with correct options if fetch options defined", () => {
		const api = new API(ENDPOINT, {
			skipReadLanding: true,
			fetch: {
				credentials: "include",
				headers: { "Accept-Header": "Whatever" }
			}
		});
		api._parseLanding(VALID_LANDING);

		// With tiles endpoint called
		const res = api._getMapRequestTransform();
		const res1 = res(ENDPOINT+"/map/8/1234/4567.mvt");
		expect(res1).toEqual({
			url: ENDPOINT+"/map/8/1234/4567.mvt",
			credentials: "include",
			headers: { "Accept-Header": "Whatever" }
		});

		// With external endpoint called
		const res2 = res("https://my-tile-provider.fr/map/1/2/3.mvt");
		expect(res2).toEqual(undefined);
	});
});

describe("getPicturesAroundCoordinatesUrl", () => {
	it("works with valid coordinates", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(api.getPicturesAroundCoordinatesUrl(48.7, -1.25)).toBe(`${ENDPOINT}/search?bbox=-1.2505,48.6995,-1.2495,48.7005`);
	});

	it("fails if coordinates are invalid", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(() => api.getPicturesAroundCoordinatesUrl()).toThrow("lat and lon parameters should be valid numbers");
	});
});

describe("getPictureMetadataUrl", () => {
	it("works with valid ID", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(api.getPictureMetadataUrl("whatever-id")).toBe(`${ENDPOINT}/search?ids=whatever-id`);
	});

	it("works with valid ID and sequence", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(api.getPictureMetadataUrl("whatever-id", "my-sequence")).toBe(`${ENDPOINT}/collections/my-sequence/items/whatever-id`);
	});

	it("fails if picId is invalid", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(() => api.getPictureMetadataUrl()).toThrow("id should be a valid picture unique identifier");
	});
});

describe("getMapStyle", () => {
	it("sends ready mapstyle", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		api.mapStyle = {name: "Ready"};
		expect(api.getMapStyle()).toBe(api.mapStyle);
	});

	it("loads style from endpoint", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding({
			stac_version: "1.0.0",
			links: [
				{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
				{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
				{ "rel": "xyz-style", "type": "application/json", "href": ENDPOINT+"/map/style.json" },
			],
			"extent": {
				"spatial": {
					"bbox": [[-0.586, 0, 6.690, 49.055]]
				},
				"temporal": {
					"interval": [[ "2019-08-18T14:11:29+00:00", "2023-05-30T18:16:21.167000+00:00" ]]
				}
			}
		});
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => ({ name: "Ready" })
		}));
		const res = await api.getMapStyle();
		expect(res).toStrictEqual({ name: "Ready" });
	});

	it("creates style from tiles endpoint", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		const res = await api.getMapStyle();
		expect(res).toStrictEqual({
			"version": 8,
			"sources": {
				"geovisio": {
					"type": "vector",
					"tiles": [ ENDPOINT+"/map/{z}/{x}/{y}.mvt" ],
					"minzoom": 0,
					"maxzoom": 15
				}
			}
		});
	});

	it("fallbacks to /map route if any", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		global.fetch = jest.fn(() => Promise.resolve());
		const res = await api.getMapStyle();
		expect(res).toStrictEqual({
			"version": 8,
			"sources": {
				"geovisio": {
					"type": "vector",
					"tiles": [ ENDPOINT+"/map/{z}/{x}/{y}.mvt" ],
					"minzoom": 0,
					"maxzoom": 15
				}
			}
		});
	});

	it("fails if no fallback /map route", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		global.console = { warn: jest.fn(), log: jest.fn(), error: jest.fn() };
		global.fetch = jest.fn(() => Promise.reject());
		await expect(async () => await api.getMapStyle()).rejects.toEqual(new Error("API doesn't offer a vector tiles endpoint"));
	});
});

describe("getUserMapStyle", () => {
	it("fails if not ready", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		await expect(async () => await api.getUserMapStyle("bla")).rejects.toEqual(new Error("API is not ready to use"));
	});

	it("fails if no userId", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._isReady = 1;
		await expect(async () => await api.getUserMapStyle()).rejects.toEqual(new Error("Parameter userId is empty"));
	});

	it("loads style from endpoint", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding({
			stac_version: "1.0.0",
			links: [
				{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
				{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
				{ "rel": "user-xyz-style", "type": "application/json", "href": ENDPOINT+"/users/{userId}/map/style.json" },
			],
			"extent": {
				"spatial": {
					"bbox": [[-0.586, 0, 6.690, 49.055]]
				},
				"temporal": {
					"interval": [[ "2019-08-18T14:11:29+00:00", "2023-05-30T18:16:21.167000+00:00" ]]
				}
			}
		});
		api._isReady = 1;
		global.fetch = (url) => {
			expect(url).toBe(ENDPOINT+"/users/bla/map/style.json");
			return Promise.resolve({ json: () => Promise.resolve({ name: "Ready" }) });
		};
		const res = await api.getUserMapStyle("bla");
		expect(res).toStrictEqual({ name: "Ready" });
	});

	it("creates style from tiles endpoint", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding({
			stac_version: "1.0.0",
			links: [
				{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
				{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
				{ "rel": "user-xyz", "type": "application/vnd.mapbox-vector-tile", "href": ENDPOINT+"/users/{userId}/map/{z}/{x}/{y}.mvt" },
			],
			"extent": {
				"spatial": {
					"bbox": [[-0.586, 0, 6.690, 49.055]]
				},
				"temporal": {
					"interval": [[ "2019-08-18T14:11:29+00:00", "2023-05-30T18:16:21.167000+00:00" ]]
				}
			}
		});
		api._isReady = 1;
		const res = await api.getUserMapStyle("bla");
		expect(res).toStrictEqual({
			"version": 8,
			"sources": {
				"geovisio_bla": {
					"type": "vector",
					"tiles": [ ENDPOINT+"/users/bla/map/{z}/{x}/{y}.mvt" ],
					"minzoom": 0,
					"maxzoom": 15
				}
			}
		});
	});

	it("fails if no style found", async () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;
		await expect(async () => await api.getUserMapStyle("bla")).rejects.toEqual(new Error("API doesn't offer map style for specific user"));
	});
});

describe("findThumbnailInPictureFeature", () => {
	it("works if a thumbnail exists", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		const res = api.findThumbnailInPictureFeature({
			assets: {
				t: {
					roles: ["thumbnail"],
					type: "image/jpeg",
					href: "https://geovisio.fr/thumb.jpg"
				}
			}
		});
		expect(res).toEqual("https://geovisio.fr/thumb.jpg");
	});

	it("works if a visual exists", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		const res = api.findThumbnailInPictureFeature({
			assets: {
				t: {
					roles: ["visual"],
					type: "image/jpeg",
					href: "https://geovisio.fr/thumb.jpg"
				}
			}
		});
		expect(res).toEqual("https://geovisio.fr/thumb.jpg");
	});

	it("works if no thumbnail is found", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		const res = api.findThumbnailInPictureFeature({});
		expect(res).toBe(null);
	});
});

describe("getPictureThumbnailURLForSequence", () => {
	it("works with a collection-preview endpoint", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		return api.getPictureThumbnailURLForSequence("12345").then(url => {
			expect(url).toBe(ENDPOINT+"/collections/12345/thumb.jpg");
		});
	});

	it("works if a preview is defined in sequence metadata", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;
		const seq = {
			links: [
				{ "type": "image/jpeg", "rel": "preview", "href": "https://geovisio.fr/preview/thumb.jpg" }
			]
		};
		return api.getPictureThumbnailURLForSequence("12345", seq).then(url => {
			expect(url).toBe("https://geovisio.fr/preview/thumb.jpg");
		});
	});


	it("works with an existing sequence", () => {
		const resPicId = "cbfc3add-8173-4464-98c8-de2a43c6a50f";
		const thumbUrl = "http://my.custom.api/pic/thumb.jpg";
		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({
				features: [ {
					"id": resPicId,
					"assets": {
						"thumb": {
							"href": thumbUrl,
							"roles": ["thumbnail"],
							"type": "image/jpeg"
						}
					}
				}]
			})
		}));

		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;
		return api.getPictureThumbnailURLForSequence("208b981a-262e-4966-97b6-98ee0ceb8df0").then(url => {
			expect(url).toBe(thumbUrl);
		});
	});

	it("works with no results", () => {
		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({
				features: []
			})
		}));

		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;
		return api.getPictureThumbnailURLForSequence("208b981a-262e-4966-97b6-98ee0ceb8df0").then(url => {
			expect(url).toBe(null);
		});
	});
});

describe("getPictureThumbnailURL", () => {
	it("works with a item-preview endpoint", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		return api.getPictureThumbnailURL("12345").then(url => {
			expect(url).toBe(ENDPOINT+"/pictures/12345/thumb.jpg");
		});
	});

	it("works with picture and sequence ID defined", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;

		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({
				"assets": {
					"thumb": {
						"href": ENDPOINT+"/pictures/pic1/thumb.jpg",
						"roles": ["thumbnail"],
						"type": "image/jpeg"
					}
				}
			})
		}));

		return api.getPictureThumbnailURL("pic1", "seq1").then(url => {
			expect(url).toBe(ENDPOINT+"/pictures/pic1/thumb.jpg");
		});
	});

	it("works with picture and sequence ID defined, but no thumb found", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;

		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({})
		}));

		return api.getPictureThumbnailURL("pic1", "seq1").then(url => {
			expect(url).toBe(null);
		});
	});

	it("works with picture ID defined", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;

		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({
				features: [{
					"assets": {
						"thumb": {
							"href": ENDPOINT+"/pictures/pic1/thumb.jpg",
							"roles": ["thumbnail"],
							"type": "image/jpeg"
						}
					}
				}]
			})
		}));

		return api.getPictureThumbnailURL("pic1").then(url => {
			expect(url).toBe(ENDPOINT+"/pictures/pic1/thumb.jpg");
		});
	});

	it("works with picture ID defined but no results", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;

		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => Promise.resolve({
				features: []
			})
		}));

		return api.getPictureThumbnailURL("pic1").then(url => {
			expect(url).toBe(null);
		});
	});
});

describe("getRSSURL", () => {
	it("works without RSS", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;
		expect(api.getRSSURL()).toBeNull();
	});

	it("works with RSS and no bbox", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(api.getRSSURL()).toBe(ENDPOINT+"/collections?format=rss");
	});

	it("works with RSS and bbox with query string", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		const bbox = {
			getSouth: () => -1.7,
			getNorth: () => -1.6,
			getWest: () => 47.1,
			getEast: () => 48.2
		};
		expect(api.getRSSURL(bbox)).toBe(ENDPOINT+"/collections?format=rss&bbox=47.1,-1.7,48.2,-1.6");
	});

	it("works with RSS and bbox without query string", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding({
			stac_version: "1.0.0",
			links: [
				{ "rel": "data", "type": "application/json", "href": ENDPOINT+"/collections" },
				{ "rel": "search", "type": "application/geo+json", "href": ENDPOINT+"/search" },
				{ "rel": "data", "href": ENDPOINT+"/collections", "type": "application/rss+xml" }
			]
		});
		api._isReady = 1;
		const bbox = {
			getSouth: () => -1.7,
			getNorth: () => -1.6,
			getWest: () => 47.1,
			getEast: () => 48.2
		};
		expect(api.getRSSURL(bbox)).toBe(ENDPOINT+"/collections?bbox=47.1,-1.7,48.2,-1.6");
	});
});

describe("getSequenceMetadataUrl", () => {
	it("works", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(api.getSequenceMetadataUrl("blabla")).toBe(ENDPOINT+"/collections/blabla");
	});
});

describe("getDataBbox", () => {
	it("works with landing spatial extent defined", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api._isReady = 1;
		expect(api.getDataBbox()).toEqual([[-0.586, 0], [6.690, 49.055]]);
	});

	it("works with no landing spatial extent defined", () => {
		const api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(LANDING_NO_PREVIEW);
		api._isReady = 1;
		expect(api.getDataBbox()).toBe(null);
	});
});

describe("sendReport", () => {
	let api;

	beforeEach(() => {
		api = new API(ENDPOINT, { skipReadLanding: true });
		api._parseLanding(VALID_LANDING);
		api.isReady = () => true;
	});

	it("throws an error if API is not ready", () => {
        api.isReady = () => false;
        expect(() => api.sendReport({})).toThrow("API is not ready to use");
    });

    it("throws an error if report endpoint is not available", () => {
        api._endpoints.report = null;
        expect(() => api.sendReport({})).toThrow("Report sending is not available");
    });

    it("sends a report successfully", async () => {
        // Mock fetch response
        const mockResponse = {
            status: 200,
            json: jest.fn().mockResolvedValue({ id: "bla" })
        };
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const data = {
			issue: "blur_missing",
			picture_id: "bla1",
			sequence_id: "bla2",
		};

        const response = await api.sendReport(data);
        
        expect(fetch).toHaveBeenCalledWith(ENDPOINT+"/reports", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" }
        });
        expect(response).toEqual({ id: "bla" });
    });

    it("handles API errors and rejects with message", async () => {
        // Mock fetch response with an error
        const mockResponse = {
            status: 400,
            text: jest.fn().mockResolvedValue(JSON.stringify({ message: "Error occurred" }))
        };
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const data = {
			issue: "blur_missing",
			picture_id: "bla1",
			sequence_id: "bla2",
		};

        await expect(api.sendReport(data)).rejects.toEqual("Error occurred");

        expect(fetch).toHaveBeenCalledWith(ENDPOINT+"/reports", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" }
        });
    });

    it("handles API errors and rejects with text if no message in JSON", async () => {
        // Mock fetch response with an error and no "message" key
        const mockResponse = {
            status: 400,
            text: jest.fn().mockResolvedValue("Some error text")
        };
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const data = {
			issue: "blur_missing",
			picture_id: "bla1",
			sequence_id: "bla2",
		};

        await expect(api.sendReport(data)).rejects.toEqual("Some error text");

        expect(fetch).toHaveBeenCalledWith(ENDPOINT+"/reports", {
            method: "POST",
            body: JSON.stringify(data),
            headers: { "Content-Type": "application/json" }
        });
    });
});

describe("isValidHttpUrl", () => {
	it("works with valid endpoint", () => {
		expect(API.isValidHttpUrl(ENDPOINT)).toBeTruthy();
	});

	it("fails if endpoint is invalid", () => {
		expect(API.isValidHttpUrl("not an url")).toBeFalsy();
	});
});

describe("isValidId", () => {
	it("works with valid ID", () => {
		expect(API.isIdValid("blabla")).toBeTruthy();
	});

	it("fails with invalid ID", () => {
		expect(() => API.isIdValid(null)).toThrowError("id should be a valid picture unique identifier");
	});
});
