import Loader from "../../src/components/Loader";

describe("constructor", () => {
	it("works", () => {
		const p = { _t: { gvs: { loading_labels_serious: ["Loading..."], loading_labels_fun: ["FUN..."] }, map: {} } };
		const c = document.createElement("div");
		const l = new Loader(p, c);
		expect(l.container.className).toBe("gvs-loader gvs-loader-visible");
		expect(l.container.innerHTML).toMatchSnapshot();
	});
});

describe("dismiss", () => {
	it("works when no error set", () => {
		const p = {
			_t: { gvs: { loading_labels_serious: ["Loading..."], loading_labels_fun: ["FUN..."] }, map: {} },
			dispatchEvent: jest.fn()
		};
		const c = document.createElement("div");
		const l = new Loader(p, c);
		l.dismiss();
		expect(c.className).toBe("gvs-loader");
		expect(p.dispatchEvent.mock.calls).toMatchSnapshot();
	});

	it("works with error set", () => {
		global.console = { error: jest.fn() };
		const p = {
			_t: { gvs: { loading_labels_serious: ["Loading..."], loading_labels_fun: ["FUN..."] }, map: {} },
			dispatchEvent: jest.fn()
		};
		const c = document.createElement("div");
		const l = new Loader(p, c);
		expect(() => l.dismiss("Technical issue", "Oops it's broken")).toThrowError("Oops it's broken");
		expect(c.className).toBe("gvs-loader gvs-loader-visible");
		expect(c.innerHTML).toMatchSnapshot();
	});
});