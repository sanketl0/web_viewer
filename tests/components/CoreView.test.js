import Loader from "../../src/components/Loader";
import CoreView from "../../src/components/CoreView";
import API from "../../src/utils/API";

jest.mock("maplibre-gl", () => ({
	addProtocol: jest.fn(),
}));

global.console = { info: jest.fn() };
global.AbortSignal = { timeout: jest.fn() };

describe("constructor", () => {
	it("works with JS element", () => {
		const container = document.createElement("div");
		const v = new CoreView(container, "https://geovisio.fr/api");
		expect(v._t).toBeDefined();
		expect(v._selectedPicId).toBeNull();
		expect(v._selectedSeqId).toBeNull();
		expect(v._api).toBeInstanceOf(API);
		expect(v.container).toBe(container);
		expect(v._loader).toBeInstanceOf(Loader);
	});

	it("works with string ID", () => {
		const container = document.createElement("div");
		container.id = "coreview";
		document.body.appendChild(container);

		const v = new CoreView("coreview", "https://geovisio.fr/api");
		expect(v._t).toBeDefined();
		expect(v._selectedPicId).toBeNull();
		expect(v._selectedSeqId).toBeNull();
		expect(v._api).toBeInstanceOf(API);
		expect(v.container).toBe(container);
		expect(v._loader).toBeInstanceOf(Loader);
	});

	it("fails on missing element", () => {
		expect(() => new CoreView("geovisio", "https://geovisio.fr/api")).toThrow(new Error("Container is not a valid HTML element, does it exist in your page ?"));
	});

	it("handle options", () => {
		const opts = {
			selectedSequence: "seq",
			selectedPicture: "pic",
			fetchOptions: { "bla": "bla" }
		};
		const container = document.createElement("div");
		const v = new CoreView(container, "https://geovisio.fr/api", opts);
		expect(v._selectedPicId).toBe("pic");
		expect(v._selectedSeqId).toBe("seq");
		expect(v._api._fetchOpts).toEqual({ "bla": "bla" });
	});
});

describe("select", () => {
	it("works", () => {
		const container = document.createElement("div");
		const v = new CoreView(container, "https://geovisio.fr/api");
		const p = new Promise(resolve => {
			v.addEventListener("select", e => {
				expect(v._selectedPicId).toBe("pic");
				expect(v._selectedSeqId).toBe("seq");
				expect(e.detail.picId).toBe("pic");
				expect(e.detail.seqId).toBe("seq");
				resolve();
			});
		});
		v.select("seq", "pic");
		return p;
	});

	it("unselects", () => {
		const container = document.createElement("div");
		const v = new CoreView(
			container,
			"https://geovisio.fr/api",
			{ selectedSequence: "seq", selectedPicture: "pic" }
		);
		const p = new Promise(resolve => {
			v.addEventListener("select", e => {
				expect(v._selectedPicId).toBeNull();
				expect(v._selectedSeqId).toBeNull();
				expect(e.detail.picId).toBeNull();
				expect(e.detail.seqId).toBeNull();
				resolve();
			});
		});
		v.select();
		return p;
	});
});
