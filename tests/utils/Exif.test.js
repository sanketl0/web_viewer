import * as Exif from "../../src/utils/Exif";

describe("getExifFloat", () => {
	it.each([
		[undefined, undefined],
		[null, undefined],
		["", undefined],
		["   ", undefined],
		[1, 1],
		[1.4, 1.4],
		["1", 1],
		["-1.4", -1.4],
		["-104/10", -10.4],
		["-104.12/-12.12", 8.590759075907592],
	])("works with %s", (input, expected) => {
		expect(Exif.getExifFloat(input)).toBe(expected);
	});
});

describe("getGPSPrecision", () => {
	it.each([
		[undefined, "❓"],
		[0.4, "0.4 m"],
		[0.9, "0.9 m"],
		[2.9, "2.9 m"],
		[6.9, "6.9 m"],
		[9.9, "9.9 m"],
		[20, "20 m"],
		["9/10", "0.9 m"],
		["99/10", "9.9 m"],
	])("handles GPSHPos %s > %s", (input, expected) => {
		const p = { properties: { exif: { "Exif.GPSInfo.GPSHPositioningError": input, "Exif.GPSInfo.GPSDOP": input } } };
		expect(Exif.getGPSPrecision(p)).toBe(expected);
	});

	it.each([
		[undefined, "❓"],
		[0.9, "ideal"],
		[1.9, "excellent"],
		[4.9, "good"],
		[9.9, "moderate"],
		[19.9, "fair"],
		[20, "poor"],
		["1/1", "excellent"],
		["15/10", "excellent"],
	])("handles GPSDOP %s > %s", (input, expected) => {
		const p = { properties: { exif: { "Exif.GPSInfo.GPSDOP": input } } };
		expect(Exif.getGPSPrecision(p)).toBe(expected);
	});
});

describe("getSphereCorrection", () => {
	it("works with API props", () => {
		const p = { properties: {
			"view:azimuth": 50,
			"pers:yaw": 42,
			"pers:pitch": -30,
			"pers:roll": 72.2
		} };
		expect(Exif.getSphereCorrection(p)).toMatchSnapshot();
	});

	it("works with exif tags", () => {
		const p = { properties: {
			exif: {
				"Xmp.Camera.Pitch": "-30/1",
				"Xmp.GPano.PoseRollDegrees": 72.2,
				"Exif.MpfInfo.MPFYawAngle": 42,
			},
			"view:azimuth": 50,
		} };
		expect(Exif.getSphereCorrection(p)).toMatchSnapshot();
	});
});

describe("getCroppedPanoData", () => {
	it("works with API props", () => {
		const p = { properties: {
			"pers:interior_orientation": {
				"sensor_array_dimensions": [15872,7936],
				"visible_area": [0,2538,0,2792]
			}
		} };
		expect(Exif.getCroppedPanoData(p)).toMatchSnapshot();
	});

	it("works with exif tags", () => {
		const p = { properties: {
			exif: {
				"Xmp.GPano.CroppedAreaImageHeightPixels": "2606",
				"Xmp.GPano.CroppedAreaImageWidthPixels": "15872",
				"Xmp.GPano.CroppedAreaLeftPixels": "0",
				"Xmp.GPano.CroppedAreaTopPixels": "2538",
				"Xmp.GPano.FullPanoHeightPixels": "7936",
				"Xmp.GPano.FullPanoWidthPixels": "15872",
			},
		} };
		expect(Exif.getCroppedPanoData(p)).toMatchSnapshot();
	});

	it("works with API props and unneeded", () => {
		const p = { properties: {
			"pers:interior_orientation": {
				"sensor_array_dimensions": [15872,7936],
				"visible_area": [0,0,0,0]
			}
		} };
		expect(Exif.getCroppedPanoData(p)).toMatchSnapshot();
	});

	it("works with exif tags and unneeded", () => {
		const p = { properties: {
			exif: {
				"Xmp.GPano.CroppedAreaImageHeightPixels": "7936",
				"Xmp.GPano.CroppedAreaImageWidthPixels": "15872",
				"Xmp.GPano.CroppedAreaLeftPixels": "0",
				"Xmp.GPano.CroppedAreaTopPixels": "0",
				"Xmp.GPano.FullPanoHeightPixels": "7936",
				"Xmp.GPano.FullPanoWidthPixels": "15872",
			},
		} };
		expect(Exif.getCroppedPanoData(p)).toMatchSnapshot();
	});
});