import * as Utils from "../../src/utils/Utils";

jest.mock("../../src/utils/Map", () => ({
	COLORS_HEX: {
		SELECTED: 0x0000ff,
	}
}));

describe("getDistance", () => {
	it("works", () => {
		const p1 = [1,1];
		const p2 = [2,2];
		const res = Utils.getDistance(p1, p2);
		expect(res).toBe(Math.sqrt(2));
	});
});

describe("sortPicturesInDirection", () => {
	it("works with next/prev links", () => {
		const sort = Utils.sortPicturesInDirection([0,0]);
		let res = sort({rel: "prev"}, {rel: "next"});
		expect(res).toBe(0);
		res = sort({rel: "prev"}, {rel: "related"});
		expect(res).toBe(-1);
		res = sort({rel: "related"}, {rel: "next"});
		expect(res).toBe(1);
	});

	it("works with related at different dates", () => {
		const sort = Utils.sortPicturesInDirection([0,0]);
		let res = sort(
			{rel: "related", date: "2023-01-01"},
			{rel: "related", date: "2022-01-01"}
		);
		expect(res).toBe(-1); // Most recent goes first
		res = sort(
			{rel: "related", date: "2022-01-01"},
			{rel: "related", date: "2023-01-01"}
		);
		expect(res).toBe(1);
	});

	it("works with related at same date", () => {
		const sort = Utils.sortPicturesInDirection([0,0]);
		let res = sort(
			{rel: "related", date: "2023-01-01", geometry: {coordinates: [0.1,0.1]}},
			{rel: "related", date: "2023-01-01", geometry: {coordinates: [0.5,0.5]}}
		);
		expect(res).toBeLessThan(0); // Nearest goes first
		res = sort(
			{rel: "related", date: "2023-01-01", geometry: {coordinates: [0.5,0.5]}},
			{rel: "related", date: "2023-01-01", geometry: {coordinates: [0.1,0.1]}}
		);
		expect(res).toBeGreaterThan(0);
		res = sort(
			{rel: "related", date: "2023-01-01", geometry: {coordinates: [0.1,0.1]}},
			{rel: "related", date: "2023-01-01", geometry: {coordinates: [0.1,0.1]}}
		);
		expect(res).toBe(0);
	});
});

describe("getAzimuth", () => {
	it("works with 0 + NE", () => {
		const pointDepart = [0, 0];
		const pointArrivee = [1, 1];
		const azimuth = Utils.getAzimuth(pointDepart, pointArrivee);
		expect(azimuth).toBe(45);
	});

	it("works with 0 + SE", () => {
		const pointDepart = [0, 0];
		const pointArrivee = [1, -1];
		const azimuth = Utils.getAzimuth(pointDepart, pointArrivee);
		expect(azimuth).toBe(135);
	});

	it("works with 0 + N", () => {
		const pointDepart = [0, 0];
		const pointArrivee = [0, 1];
		const azimuth = Utils.getAzimuth(pointDepart, pointArrivee);
		expect(azimuth).toBe(0);
	});

	it("works with 0 + S", () => {
		const pointDepart = [0, 0];
		const pointArrivee = [0, -1];
		const azimuth = Utils.getAzimuth(pointDepart, pointArrivee);
		expect(azimuth).toBe(180);
	});
});

describe("getRelativeHeading", () => {
	it("should throw an error if no picture selected", () => {
		expect(() => Utils.getRelativeHeading()).toThrow("No picture selected");
	});

	it("should calculate relative heading correctly", () => {
		const pictureMetadata = {
			properties: { "view:azimuth": 30 },
			sequence: { prevPic: "prevPictureId", nextPic: "nextPictureId" },
			links: [
				{ nodeId: "prevPictureId", gps: [0, 0] },
				{ nodeId: "nextPictureId", gps: [2, 2] }
			],
			gps: [1, 1]
		};
			
		expect(Utils.getRelativeHeading(pictureMetadata)).toBe(-15);
	});

	it("works looking behind", () => {
		const pictureMetadata = {
			properties: { "view:azimuth": 226 },
			sequence: { prevPic: "prevPictureId", nextPic: "nextPictureId" },
			links: [
				{ nodeId: "prevPictureId", gps: [0, 0] },
				{ nodeId: "nextPictureId", gps: [2, 2] }
			],
			gps: [1, 1]
		};
			
		expect(Utils.getRelativeHeading(pictureMetadata)).toBe(-179);
	});

	it("works with distorted path", () => {
		const pictureMetadata = {
			properties: { "view:azimuth": 100 },
			sequence: { prevPic: "prevPictureId", nextPic: "nextPictureId" },
			links: [
				{ nodeId: "prevPictureId", gps: [0, 0] },
				{ nodeId: "nextPictureId", gps: [2, 1] }
			],
			gps: [1, 0]
		};
			
		expect(Utils.getRelativeHeading(pictureMetadata)).toBe(10);
	});

	it("works without previous link", () => {
		const pictureMetadata = {
			properties: { "view:azimuth": 100 },
			sequence: { nextPic: "nextPictureId" },
			links: [
				{ nodeId: "nextPictureId", gps: [2, 1] }
			],
			gps: [1, 1]
		};
			
		expect(Utils.getRelativeHeading(pictureMetadata)).toBe(10);
	});

	it("should handle missing prevPic or nextPic", () => {
		const metadataWithoutPrevNext = {
			properties: { "view:azimuth": 30 },
			gps: [0, 0]
		};
		expect(Utils.getRelativeHeading(metadataWithoutPrevNext)).toBe(0);
	});
});

describe("getSimplifiedAngle", () => {
	it("returns \"N\"", () => {
		expect(Utils.getSimplifiedAngle([0, 0], [0, 1])).toBe("N");
	});

	it("returns \"ENE\"", () => {
		expect(Utils.getSimplifiedAngle([0, 0], [1, 1])).toBe("ENE");
	});

	it("returns \"ESE\"", () => {
		expect(Utils.getSimplifiedAngle([0, 0], [1, -1])).toBe("ESE");
	});

	it("returns \"S\"", () => {
		expect(Utils.getSimplifiedAngle([0, 0], [0, -1])).toBe("S");
	});

	it("returns \"WNW\"", () => {
		expect(Utils.getSimplifiedAngle([0, 0], [-1, 1])).toBe("WNW");
	});

	it("returns \"WSW\"", () => {
		expect(Utils.getSimplifiedAngle([0, 0], [-1, -1])).toBe("WSW");
	});
});

describe("positionToXYZ", () => {
	it("works with xy", () => {
		const r = Utils.positionToXYZ({ pitch: 10, yaw: -5 });
		expect(r).toEqual({ x: -286.4788975654116, y: 572.9577951308232 });
	});

	it("works with xyz", () => {
		const r = Utils.positionToXYZ({ pitch: 10, yaw: -5 }, 15);
		expect(r).toEqual({ x: -286.4788975654116, y: 572.9577951308232, z: 15 });
	});
});

describe("xyzToPosition", () => {
	it("works with xyz", () => {
		const r = Utils.xyzToPosition(-286.4788975654116, 572.9577951308232, 15);
		expect(r).toEqual({ pitch: 10, yaw: -5, zoom: 15 });
	});
});

describe("getNodeCaption", () => {
	it("works with date", () => {
		const m = { properties: { datetime: "2022-02-01T12:15:36Z" } };
		global.Date = jest.fn(() => ({ toLocaleDateString: () => "February 2 2022" }));
		const res = Utils.getNodeCaption(m, { gvs: { metadata_general_license_link: "" }});
		expect(res).toMatchSnapshot();
	});

	it("works with date+tz", () => {
		const m = { properties: { datetimetz: "2022-02-01T12:15:36-03:00" } };
		global.Date = jest.fn(() => ({ toLocaleDateString: () => "February 2 2022" }));
		const res = Utils.getNodeCaption(m, { gvs: { metadata_general_license_link: "" }});
		expect(res).toMatchSnapshot();
	});

	it("works with producer", () => {
		const m = { providers: [ { name: "PanierAvide", roles: ["producer", "licensor"] } ] };
		const res = Utils.getNodeCaption(m, { gvs: { metadata_general_license_link: "" }});
		expect(res).toMatchSnapshot();
	});

	it("works with date + producer", () => {
		const m = { properties: { datetime: "2022-02-01T12:15:36Z" }, providers: [ { name: "PanierAvide", roles: ["producer", "licensor"] } ] };
		global.Date = jest.fn(() => ({ toLocaleDateString: () => "February 2 2022" }));
		const res = Utils.getNodeCaption(m, { gvs: { metadata_general_license_link: "" }});
		expect(res).toMatchSnapshot();
	});

	it("works with date + 2 producers", () => {
		const m = {
			properties: { datetime: "2022-02-01T12:15:36Z" },
			providers: [
				{ name: "GeoVisio Corp.", roles: ["producer", "licensor"] },
				{ name: "PanierAvide", roles: ["producer"] },
			]
		};
		global.Date = jest.fn(() => ({ toLocaleDateString: () => "February 2 2022" }));
		const res = Utils.getNodeCaption(m, { gvs: { metadata_general_license_link: "" }});
		expect(res).toMatchSnapshot();
	});
});

describe("getCookie", () => {
    it("should return the value of the specified cookie", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValueOnce("session=abc123");
        expect(Utils.getCookie("session")).toBe("abc123");
    });

    it("should return null if the cookie is not found", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValueOnce("session=abc123");
        expect(Utils.getCookie("user_id")).toBeUndefined();
    });

    it("should return the correct value when multiple cookies are set", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValueOnce("session=abc123; user_id=789; user_name=John");
        expect(Utils.getCookie("user_id")).toBe("789");
    });

    it("should return null if cookie with the specified name has no value", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValueOnce("session=; user_id=789");
        expect(Utils.getCookie("session")).toBe("");
    });

    it("should return the correct value when the cookie contains =", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValueOnce("custom_cookie=abc=123");
        expect(Utils.getCookie("custom_cookie")).toBe("abc=123");
    });
});

describe("getUserAccount", () => {
    it("should return an object with user id and name when all cookies are present", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValue("session=abc123; user_id=789; user_name=John");
        expect(Utils.getUserAccount()).toEqual({ id: "789", name: "John" });
    });

    it("should return null if session cookie is missing", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValue("user_id=789; user_name=John");
        expect(Utils.getUserAccount()).toBeNull();
    });

    it("should return null if user_id cookie is missing", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValue("session=abc123; user_name=John");
        expect(Utils.getUserAccount()).toBeNull();
    });

    it("should return null if user_name cookie is missing", () => {
        jest.spyOn(document, "cookie", "get").mockReturnValue("session=abc123; user_id=789");
        expect(Utils.getUserAccount()).toBeNull();
    });

    it("should return null if all cookies are missing", () => {
        expect(Utils.getUserAccount()).toBeNull();
    });
});
