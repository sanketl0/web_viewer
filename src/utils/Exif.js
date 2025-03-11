/**
 * Read float value from EXIF tags (to handle fractions & all)
 * @param {*} val The input EXIF tag value
 * @returns {number|undefined} The parsed value, or undefined if value is not readable
 * @private
 */
export function getExifFloat(val) {
	// Null-like values
	if(
		[null, undefined, ""].includes(val)
		|| typeof val === "string" && val.trim() === ""
	) {
		return undefined;
	}
	// Already valid number
	else if(typeof val === "number") {
		return val;
	}
	// String
	else if(typeof val === "string") {
		// Check if looks like a fraction
		if(/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/.test(val)) {
			const parts = val.split("/").map(p => parseFloat(p));
			return parts[0] / parts[1];
		}

		// Try a direct cast to float
		try { return parseFloat(val); }
		catch(e) {} // eslint-disable-line no-empty

		// Unrecognized
		return undefined;
	}
	else { return undefined; }
}

/**
 * Find in picture metadata the GPS precision.
 * @param {object} picture The GeoJSON picture feature
 * @returns {string} The precision value (poor, fair, moderate, good, excellent, ideal, unknown)
 * @private
 */
export function getGPSPrecision(picture) {
	let quality = "❓";
	const gpsHPosError = picture?.properties?.["quality:horizontal_accuracy"] || getExifFloat(picture?.properties?.exif?.["Exif.GPSInfo.GPSHPositioningError"]);
	const gpsDop = getExifFloat(picture?.properties?.exif?.["Exif.GPSInfo.GPSDOP"]);
	
	if(gpsHPosError !== undefined) {
		quality = `${gpsHPosError} m`;
	}
	else if(gpsDop !== undefined) {
		if(gpsDop < 1) { quality = "ideal"; }
		else if(gpsDop < 2) { quality = "excellent"; }
		else if(gpsDop < 5) { quality = "good"; }
		else if(gpsDop < 10) { quality = "moderate"; }
		else if(gpsDop < 20) { quality = "fair"; }
		else { quality = "poor"; }
	}

	return quality;
}

/**
 * Compute PSV sphere correction based on picture metadata & EXIF tags.
 * @param {object} picture The GeoJSON picture feature
 * @returns {object} The PSV sphereCorrection value
 * @private
 */
export function getSphereCorrection(picture) {
	// Photo direction
	let dir = picture.properties?.["view:azimuth"];
	if(dir === undefined) {
		const v = getExifFloat(picture.properties?.exif?.["Exif.GPSInfo.GPSImgDirection"]);
		if(v !== undefined) {
			dir = v;
		}
	}
	dir = dir || 0;

	// Yaw
	let yaw = picture.properties?.["pers:yaw"];
	let exifFallbacks = ["Xmp.GPano.PoseHeadingDegrees", "Xmp.Camera.Yaw", "Exif.MpfInfo.MPFYawAngle"];
	if(yaw === undefined) {
		for(let exif of exifFallbacks) {
			const v = getExifFloat(picture.properties?.exif?.[exif]);
			if(v !== undefined) {
				yaw = v;
				break;
			}
		}
	}
	yaw = yaw || 0;

	// Check if yaw is applicable: different from photo direction
	if(Math.round(dir) === Math.round(yaw) && yaw > 0) {
		console.warn("Picture with UUID", picture.id, "has same GPS Image direction and Yaw, could cause rendering issues");
		// yaw = 0;
	}

	// Pitch
	let pitch = picture.properties?.["pers:pitch"];
	exifFallbacks = ["Xmp.GPano.PosePitchDegrees", "Xmp.Camera.Pitch", "Exif.MpfInfo.MPFPitchAngle"];
	if(pitch === undefined) {
		for(let exif of exifFallbacks) {
			const v = getExifFloat(picture.properties?.exif?.[exif]);
			if(v !== undefined) {
				pitch = v;
				break;
			}
		}
	}
	pitch = pitch || 0;

	// Roll
	let roll = picture.properties?.["pers:roll"];
	exifFallbacks = ["Xmp.GPano.PoseRollDegrees", "Xmp.Camera.Roll", "Exif.MpfInfo.MPFRollAngle"];
	if(roll === undefined) {
		for(let exif of exifFallbacks) {
			const v = getExifFloat(picture.properties?.exif?.[exif]);
			if(v !== undefined) {
				roll = v;
				break;
			}
		}
	}
	roll = roll || 0;

	// Send result
	return pitch !== 0 && roll !== 0 ? {
		pan:  yaw * Math.PI / 180,
		tilt: pitch * Math.PI / 180,
		roll: roll * Math.PI / 180,
	} : {};
}

/**
 * Compute PSV panoData for cropped panorama based on picture metadata & EXIF tags.
 * @param {object} picture The GeoJSON picture feature
 * @returns {object} The PSV panoData values
 * @private
 */
export function getCroppedPanoData(picture) {
	let res;

	if(picture.properties?.["pers:interior_orientation"]) {
		if(
			picture.properties["pers:interior_orientation"]?.["visible_area"]
			&& picture.properties["pers:interior_orientation"]?.["sensor_array_dimensions"]
		) {
			const va = picture.properties["pers:interior_orientation"]["visible_area"];
			const sad = picture.properties["pers:interior_orientation"]["sensor_array_dimensions"];
			try {
				res = {
					fullWidth: parseInt(sad[0]),
					fullHeight: parseInt(sad[1]),
					croppedX: parseInt(va[0]),
					croppedY: parseInt(va[1]),
					croppedWidth: parseInt(sad[0]) - parseInt(va[2]) - parseInt(va[0]),
					croppedHeight: parseInt(sad[1]) - parseInt(va[3]) - parseInt(va[1]),
				};
			}
			catch(e) {
				console.warn("Invalid pers:interior_orientation values for cropped panorama "+picture.id);
			}
		}
	}

	if(!res && picture.properties?.exif) {
		try {
			res = {
				fullWidth: parseInt(picture.properties.exif?.["Xmp.GPano.FullPanoWidthPixels"]),
				fullHeight: parseInt(picture.properties.exif?.["Xmp.GPano.FullPanoHeightPixels"]),
				croppedX: parseInt(picture.properties.exif?.["Xmp.GPano.CroppedAreaLeftPixels"]),
				croppedY: parseInt(picture.properties.exif?.["Xmp.GPano.CroppedAreaTopPixels"]),
				croppedWidth: parseInt(picture.properties.exif?.["Xmp.GPano.CroppedAreaImageWidthPixels"]),
				croppedHeight: parseInt(picture.properties.exif?.["Xmp.GPano.CroppedAreaImageHeightPixels"]),
			};
		}
		catch(e) {
			console.warn("Invalid XMP.GPano values for cropped panorama "+picture.id);
		}
	}

	// Check if crop is really necessary
	if(res) {
		res = Object.fromEntries(Object.entries(res || {}).filter(e => !isNaN(e[1])));
		if(res.fullWidth == res.croppedWidth && res.fullHeight == res.croppedHeight) {
			res = {};
		}
	}

	return res || {};
}