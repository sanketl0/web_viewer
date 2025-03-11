import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import * as Widgets from "../../src/utils/Widgets";

describe("createButton", () => {
	it("works", () => {
		const child = document.createElement("span");
		const btn = Widgets.createButton("mybtn", child, "blabla", ["gvs-blabla"]);
		expect(btn.className).toBe("gvs-btn gvs-widget-bg gvs-blabla");
		expect(btn.id).toBe("mybtn");
		expect(btn.children[0]).toBe(child);
		expect(btn.title).toBe("blabla");
	});

	it("works without options", () => {
		const child = document.createElement("span");
		const btn = Widgets.createButton("mybtn");
		expect(btn.className).toBe("gvs-btn gvs-widget-bg");
		expect(btn.id).toBe("mybtn");
		expect(btn.children.length).toBe(0);
		expect(btn.title).toBe("");
	});
});

describe("createExpandableButton", () => {
	it("works with large container", () => {
		const container = { _viewer: { isWidthSmall: () => false } };
		const btn = Widgets.createExpandableButton("mybtn", faChevronDown, "blabla", container, ["gvs-blabla"]);
		expect(btn.className).toBe("gvs-btn gvs-widget-bg gvs-btn-expandable gvs-blabla");
		expect(btn.innerHTML).toMatchSnapshot();
		expect(btn.id).toBe("mybtn");
	});

	it("works with small container", () => {
		const container = { _viewer: { isWidthSmall: () => true } };
		const btn = Widgets.createExpandableButton("mybtn", faChevronDown, "blabla", container, ["gvs-blabla"]);
		expect(btn.className).toBe("gvs-btn gvs-widget-bg gvs-btn-expandable gvs-blabla");
		expect(btn.innerHTML).toMatchSnapshot();
		expect(btn.id).toBe("mybtn");
	});
});

describe("createSearchBar", () => {
	it("works", () => {
		const container = { _t: {} };
		const btn = Widgets.createSearchBar("mysrch", "no res", jest.fn(), jest.fn(), container);
		expect(btn.className).toBe("gvs-widget-bg gvs-search-bar");
		expect(btn.innerHTML).toMatchSnapshot();
		expect(btn.id).toBe("mysrch");
	});
});

describe("createPanel", () => {
	it("works", () => {
		const btn = document.createElement("button");
		btn.id = "btngvs";
		btn.addEventListener = jest.fn();
		const child = document.createElement("span");
		const pnl = Widgets.createPanel({}, btn, [child], ["gvs-blabla"]);
		expect(pnl.id).toBe("btngvs-panel");
		expect(pnl.className).toBe("gvs-panel gvs-widget-bg gvs-hidden gvs-blabla");
		expect(pnl.innerHTML).toMatchSnapshot();
		expect(btn.addEventListener.mock.calls).toMatchSnapshot();
	});
});

describe("createGroup", () => {
	it("works", () => {
		const container = { _corners: { "main-top-left": document.createElement("div") } };
		const child = document.createElement("span");
		const grp = Widgets.createGroup("grp", "main-top-left", container, [child], ["gvs-blabla"]);
		expect(grp.className).toBe("gvs-group gvs-blabla");
		expect(grp.innerHTML).toMatchSnapshot();
		expect(grp.id).toBe("grp");
		expect(container._corners["main-top-left"].children[0]).toBe(grp);
	});
});

describe("enableButton", () => {
	it("works", () => {
		const btn = document.createElement("button");
		btn.setAttribute("disabled", "");
		Widgets.enableButton(btn);
		expect(btn.getAttribute("disabled")).toBeNull();
	});
});

describe("disableButton", () => {
	it("works", () => {
		const btn = document.createElement("button");
		Widgets.disableButton(btn);
		expect(btn.getAttribute("disabled")).toBe("");
	});
});

describe("fa", () => {
	it("works", () => {
		const res = Widgets.fa(faChevronDown);
		expect(res).toMatchSnapshot();
	});
});

describe("fat", () => {
	it("works", () => {
		const res = Widgets.fat(faChevronDown);
		expect(res).toMatchSnapshot();
	});
});