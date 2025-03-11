import * as Map from "../../src/utils/Map";
import GEOCODER_NOMINATIM from "../data/Map_geocoder_nominatim.json";
import GEOCODER_BAN from "../data/Map_geocoder_ban.json";


jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
	Popup: function() {
		return {
			on: jest.fn(),
		};
	},
	LngLat: function() {
		return { lng: -1.7, lat: 47.8 };
	},
	LngLatBounds: function() {
		return { sw: { lng: -1.7, lat: 47.8 }, ne: { lng: -1.7, lat: 47.8 } };
	},
}));


describe("getThumbGif", () => {
	it("works", () => {
		const lang = { loading: "Loading..." };
		const res = Map.getThumbGif(lang);
		expect(res).toBeDefined();
		expect(res.tagName).toBe("IMG");
		expect(res.alt).toBe(lang.loading);
		expect(res.title).toBe(lang.loading);
	});
});

describe("getUserLayerId", () => {
	it("works with default tiles", () => {
		expect(Map.getUserLayerId("geovisio", "pictures")).toBe("geovisio_pictures");
	});

	it("works with specific user tiles", () => {
		expect(Map.getUserLayerId("toto", "pictures")).toBe("geovisio_toto_pictures");
	});
});

describe("getUserSourceId", () => {
	it("works with default tiles", () => {
		expect(Map.getUserSourceId("geovisio")).toBe("geovisio");
	});

	it("works with specific user tiles", () => {
		expect(Map.getUserSourceId("toto")).toBe("geovisio_toto");
	});
});

describe("switchCoefValue", () => {
	it("works", () => {
		const l = {id: "bla", paint: { "circle-radius": ["bla", ["get", "coef"]]}, layout: {"circle-sort": "coef"}};
		const res = Map.switchCoefValue(l, "coef_360");
		expect(res).toEqual({id: "bla", paint: { "circle-radius": ["bla", ["get", "coef_360"]]}, layout: {"circle-sort": "coef_360"}})
	});
});

describe("geocoderParamsToURLString", () => {
	it("works", () => {
		const p = { bla: "blorg", you: 1 };
		const r = Map.geocoderParamsToURLString(p);
		expect(r).toEqual("bla=blorg&you=1");
	});

	it("handles special characters", () => {
		const p = { bbox: "12,14,-45,78" };
		const r = Map.geocoderParamsToURLString(p);
		expect(r).toEqual("bbox=12%2C14%2C-45%2C78");
	});

	it("filters nulls", () => {
		const p = { val1: undefined, val2: null, val3: 0 };
		const r = Map.geocoderParamsToURLString(p);
		expect(r).toEqual("val3=0");
	});
});

describe("forwardGeocodingNominatim", () => {
	it("works", () => {
		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => GEOCODER_NOMINATIM
		}));

		// Search config
		const cfg = { query: "bla", limit: 5, bbox: "17.7,-45.2,17.8,-45.1" };

		return Map.forwardGeocodingNominatim(cfg).then(res => {
			expect(global.fetch.mock.calls).toEqual([["https://nominatim.openstreetmap.org/search?q=bla&limit=5&viewbox=17.7%2C-45.2%2C17.8%2C-45.1&format=geojson&polygon_geojson=1&addressdetails=1"]]);
			expect(res).toMatchSnapshot();
		});
	});
});

describe("forwardGeocodingBAN", () => {
	it("works", () => {
		// Mock API search
		global.fetch = jest.fn(() => Promise.resolve({
			json: () => GEOCODER_BAN
		}));

		// Search config
		const cfg = { query: "bla", limit: 5, proximity: "17.7,-45.2" };

		return Map.forwardGeocodingBAN(cfg).then(res => {
			expect(global.fetch.mock.calls).toEqual([["https://api-adresse.data.gouv.fr/search/?q=bla&limit=5&lat=17.7&lon=-45.2"]]);
			expect(res).toMatchSnapshot();
		});
	});
});
