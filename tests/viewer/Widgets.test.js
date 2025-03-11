import Widgets from "../../src/viewer/Widgets.js";
import T_fr from "../../src/translations/fr.json";

const TRANSLATIONS = {"fr": T_fr};

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

const createViewer = () => {
	const vc = document.createElement("div");
	const vmac = document.createElement("div");
	const vmin = document.createElement("div");
	vc.appendChild(vmac);
	vc.appendChild(vmin);
	return {
		_t: TRANSLATIONS.fr,
		_api: {
			_endpoints: {},
			getRSSURL: jest.fn(),
		},
		container: vc,
		mainContainer: vmac,
		miniContainer: vmin,
		isWidthSmall: () => false,
		addEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
		setPopup: jest.fn(),
		getPicturesNavigation: () => null,
		psv: {
			getTransitionDuration: jest.fn(),
			getPictureMetadata: jest.fn(),
			getZoomLevel: jest.fn(),
			getPictureOriginalHeading: jest.fn(),
		},
	};
};

describe("constructor", () => {
	it("works", () => {
		const v = createViewer();
		const w = new Widgets(v, {bla: "bla"});
		expect(v.container.innerHTML).toMatchSnapshot();
		expect(w._options).toStrictEqual({bla: "bla", editIdUrl: "https://www.openstreetmap.org/edit"});
	});

	it("works with small container", () => {
		const v = createViewer();
		v.isWidthSmall = () => true;
		const w = new Widgets(v);
		expect(v.container.innerHTML).toMatchSnapshot();
	});

	it("works with iframeBaseURL option", () => {
		const v = createViewer();
		const w = new Widgets(v, { iframeBaseURL: "https://geovisio.fr/iframed/" });
		expect(w._options.iframeBaseURL).toEqual("https://geovisio.fr/iframed/");
		expect(v.container.innerHTML).toMatchSnapshot();
	});
});

describe("_showPictureMetadataPopup", () => {
	it("fails if no picture is selected", () =>{
		const v = createViewer();
		v.psv.getPictureMetadata = () => null;
		const w = new Widgets(v);
		expect(() => w._showPictureMetadataPopup()).toThrowError("No picture currently selected");
	});

	it("works when metadata is available", () => {
		const v = createViewer();
		v._api.getPictureMetadataUrl = () => "https://geovisio.fr/api/picture/metadata.json";
		v._api.getSequenceMetadataUrl = () => "https://geovisio.fr/api/sequence/metadata.json";
		v.psv.getPictureMetadata = () => ({
			id: "blablabla",
			caption: { producer: "Adrien PAVIE", license: "CC-BY-SA 4.0", date: new Date("2024-01-01") },
			panorama: {
				baseUrl: "https://geovisio.fr/api/pictures/blablabla/sd.jpg",
				hdUrl: "https://geovisio.fr/api/pictures/blablabla/hd.jpg",
				cols: 2,
				rows: 1,
				width: 2048,
				tileUrl: () => "https://geovisio.fr/api/pictures/blablabla/tile.jpg"
			},
			links: {},
			gps: [-1.7, 48.6],
			sequence: {
				id: "seq",
				nextPic: "blanext",
				prevPic: "blaprev"
			},
			sphereCorrection: { pan: 0 },
			horizontalFov: 90,
			properties: {
				"view:azimuth": 90,
				"pers:interior_orientation": {
					camera_manufacturer: "IKEA",
					camera_model: "360 en Kit",
					focal_length: 3
				},
				exif: {
					"Exif.GPSInfo.GPSDOP": 1
				}
			}
		});
		const w = new Widgets(v);
		Date.prototype.toLocaleDateString = () => "1 janvier 2024 à 01:00:00,000";
		w._showPictureMetadataPopup();
		expect(v.setPopup.mock.calls).toMatchSnapshot();
		expect(v.dispatchEvent.mock.calls).toMatchSnapshot();
	});
});
