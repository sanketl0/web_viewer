import { getSphereCorrection, getCroppedPanoData } from "./Exif";

import ArrowTriangleSVG from "../img/arrow_triangle.svg";
import ArrowTurnSVG from "../img/arrow_turn.svg";

export const BASE_PANORAMA_ID = "geovisio-fake-id-0";

export const COLORS = {
	BASE: "#FF6F00",
	SELECTED: "#1E88E5",
	HIDDEN: "#34495E",
	NEXT: "#ffab40",

	QUALI_1: "#00695C", // 360
	QUALI_2: "#fd8d3c", // flat

	PALETTE_1: "#fecc5c", // Oldest
	PALETTE_2: "#fd8d3c",
	PALETTE_3: "#f03b20",
	PALETTE_4: "#bd0026" // Newest
};

export const COLORS_HEX = Object.fromEntries(Object.entries(COLORS).map(e => {
	e[1] = parseInt(e[1].slice(1), 16);
	return e;
}));

export const QUALITYSCORE_VALUES = [
	{ color: "#007f4e", label: "A" },
	{ color: "#72b043", label: "B" },
	{ color: "#b5be2f", label: "C" },
	{ color: "#f8cc1b", label: "D" },
	{ color: "#f6a020", label: "E" },
];

export const QUALITYSCORE_RES_FLAT_VALUES = [1, 10, 2, 15, 3, 30, 4];				// Grade, < Px/FOV value
export const QUALITYSCORE_RES_360_VALUES = [3, 15, 4, 30, 5];						// Grade, < Px/FOV value
export const QUALITYSCORE_GPS_VALUES = [5, 1.01, 4, 2.01, 3, 5.01, 2, 10.01, 1];	// Grade, < Meters value
export const QUALITYSCORE_POND_RES = 4/5;
export const QUALITYSCORE_POND_GPS = 1/5;

const ArrowTriangle = svgToPSVLink(ArrowTriangleSVG, "white");
const ArrowTurn = svgToPSVLink(ArrowTurnSVG, COLORS.NEXT);


/**
 * Find the grade associated to an input Quality Score definition.
 * @param {number[]} ranges The QUALITYSCORE_*_VALUES definition
 * @param {number} value The picture value
 * @return {number} The corresponding grade (1 to 5, or null if missing)
 * @private
 */
export function getGrade(ranges, value) {
	if(value === null || value === undefined || value === "") { return null; }

	// Read each pair from table (grade, reference value)
	for(let i = 0; i < ranges.length; i += 2) {
		const grade = ranges[i];
		const limit = ranges[i+1];

		// Send grade if value is under limit
		if (value < limit) { return grade;}
	}
	// Otherwise, send last grade
	return ranges[ranges.length - 1];
}

/**
 * Get cartesian distance between two points
 * @param {number[]} from Start [x,y] coordinates
 * @param {number[]} to End [x,y] coordinates
 * @returns {number} The distance
 * @private
 */
export function getDistance(from, to) {
	const dx = from[0] - to[0];
	const dy = from[1] - to[1];
	return Math.sqrt(dx*dx + dy*dy);
}

/**
 * Compare function to retrieve most appropriate picture in a single direction.
 * 
 * @param {number[]} picPos The picture [x,y] position
 * @returns {function} A compare function for sorting
 * @private
 */
export function sortPicturesInDirection(picPos) {
	return (a,b) => {
		// Two prev/next links = no sort
		if(a.rel != "related" && b.rel != "related") { return 0; }
		// First is prev/next link = goes first
		else if(a.rel != "related") { return -1; }
		// Second is prev/next link = goes first
		else if(b.rel != "related") { return 1; }
		// Two related links same day = nearest goes first
		else if(a.date == b.date) { return getDistance(picPos, a.geometry.coordinates) - getDistance(picPos, b.geometry.coordinates); }
		// Two related links at different day = recent goes first
		else { return b.date.localeCompare(a.date); }
	};
}

/**
 * Transforms a Base64 SVG string into a DOM img element.
 * @param {string} svg The SVG as Base64 string
 * @returns {Element} The DOM image element
 * @private
 */
function svgToPSVLink(svg, fillColor) {
	try {
		const svgStr = atob(svg.replace(/^data:image\/svg\+xml;base64,/, ""));
		const svgXml = (new DOMParser()).parseFromString(svgStr, "image/svg+xml").childNodes[0];
		const btn = document.createElement("button");
		btn.appendChild(svgXml);
		btn.classList.add("gvs-psv-tour-arrows");//"psv-virtual-tour-arrow", "psv-virtual-tour-link");
		btn.style.color = fillColor;
		return btn;
	}
	catch(e) {
		const img = document.createElement("img");
		img.src = svg;
		img.alt = "";
		return img;
	}
}

/**
 * Clones a model PSV link
 * @private
 */
function getArrow(a) {
	const d = a.cloneNode(true);
	d.addEventListener("pointerup", () => d.classList.add("gvs-clicked"));
	return d;
}

/**
 * Get direction based on angle
 * @param {number[]} from Start [x,y] coordinates
 * @param {number[]} to End [x,y] coordinates
 * @returns {number} The azimuth, from 0 to 360°
 * @private
 */
export function getAzimuth(from, to) {
	return (Math.atan2(to[0] - from[0], to[1] - from[1]) * (180 / Math.PI) + 360) % 360;
}

/**
 * Computes relative heading for a single picture, based on its metadata
 * @param {*} m The picture metadata
 * @returns {number} The relative heading
 * @private
 */
export function getRelativeHeading(m) {
	if(!m) { throw new Error("No picture selected"); }

	let prevSegDir, nextSegDir;
	const currHeading = m.properties["view:azimuth"];

	// Previous picture GPS coordinates
	if(m?.sequence?.prevPic) {
		const prevLink = m?.links?.find(l => l.nodeId === m.sequence.prevPic);
		if(prevLink) {
			prevSegDir = (((currHeading - getAzimuth(prevLink.gps, m.gps)) + 180) % 360) - 180;
		}
	}

	// Next picture GPS coordinates
	if(m?.sequence?.nextPic) {
		const nextLink = m?.links?.find(l => l.nodeId === m.sequence.nextPic);
		if(nextLink) {
			nextSegDir = (((currHeading - getAzimuth(m.gps, nextLink.gps)) + 180) % 360) - 180;
		}
	}

	return prevSegDir !== undefined ? prevSegDir : (nextSegDir !== undefined ? nextSegDir : 0);
}

/**
 * Get direction based on angle
 * @param {number[]} from Start [x,y] coordinates
 * @param {number[]} to End [x,y] coordinates
 * @returns {string} Direction (N/ENE/ESE/S/WSW/WNW)
 * @private
 */
export function getSimplifiedAngle(from, to) {
	const angle = Math.atan2(to[0] - from[0], to[1] - from[1]) * (180 / Math.PI); // -180 to 180°

	// 6 directions version
	if (Math.abs(angle) < 30) { return "N"; }
	else if (angle >= 30 && angle < 90) { return "ENE"; }
	else if (angle >= 90 && angle < 150) { return "ESE"; }
	else if (Math.abs(angle) >= 150) { return "S"; }
	else if (angle <= -30 && angle > -90) { return "WNW"; }
	else if (angle <= -90 && angle > -150) { return "WSW"; }
}

/**
 * Converts result from getPosition or position-updated event into x/y/z coordinates
 *
 * @param {object} pos pitch/yaw as given by PSV
 * @param {number} zoom zoom as given by PSV
 * @returns {object} Coordinates as x/y in degrees and zoom as given by PSV
 * @private
 */
export function positionToXYZ(pos, zoom = undefined) {
	const res = {
		x: pos.yaw * (180/Math.PI),
		y: pos.pitch * (180/Math.PI)
	};

	if(zoom !== undefined) { res.z = zoom; }
	return res;
}

/**
 * Converts x/y/z coordinates into PSV position (lat/lon/zoom)
 *
 * @param {number} x The X coordinate (in degrees)
 * @param {number} y The Y coordinate (in degrees)
 * @param {number} z The zoom level (0-100)
 * @returns {object} Position coordinates as yaw/pitch/zoom
 * @private
 */
export function xyzToPosition(x, y, z) {
	return {
		yaw: x / (180/Math.PI),
		pitch: y / (180/Math.PI),
		zoom: z
	};
}

/**
 * Generates the navbar caption based on a single picture metadata
 *
 * @param {object} metadata The picture metadata
 * @param {object} t The labels translations container
 * @returns {object} Normalized object with user name, licence and date
 * @private
 */
export function getNodeCaption(metadata, t) {
	const caption = {};

	// Timestamp
	if(metadata?.properties?.datetimetz) {
		caption.date = new Date(metadata.properties.datetimetz);
	}
	else if(metadata?.properties?.datetime) {
		caption.date = new Date(metadata.properties.datetime);
	}

	// Producer
	if(metadata?.providers) {
		const producerRoles = metadata?.providers?.filter(el => el?.roles?.includes("producer"));
		if(producerRoles?.length >= 0) {
			// Avoid duplicates between account name and picture author
			const producersDeduped = {};
			producerRoles.map(p => p.name).forEach(p => {
				const pmin = p.toLowerCase().replace(/\s/g, "");
				if(producersDeduped[pmin]) { producersDeduped[pmin].push(p); }
				else { producersDeduped[pmin] = [p];}
			});

			// Keep best looking name for each
			caption.producer = [];
			Object.values(producersDeduped).forEach(pv => {
				const deflt = pv[0];
				const better = pv.find(v => v.toLowerCase() != v);
				caption.producer.push(better || deflt);
			});
			caption.producer = caption.producer.join(", ");
		}
	}

	// License
	if(metadata?.properties?.license) {
		caption.license = metadata.properties.license;
		// Look for URL to license
		if(metadata?.links) {
			const licenseLink = metadata.links.find(l => l?.rel === "license");
			if(licenseLink) {
				caption.license = `<a href="${licenseLink.href}" title="${t.gvs.metadata_general_license_link}" target="_blank">${caption.license}</a>`;
			}
		}
	}

	return caption;
}

/**
 * Creates links between map and photo elements.
 * This enable interactions like click on map showing picture.
 * 
 * @param {CoreView} parent The view containing both Photo and Map elements
 * @private
 */
export function linkMapAndPhoto(parent) {
	// Switched picture
	const onPicLoad = e => {
		if(!e.detail.picId || e.detail.picId === BASE_PANORAMA_ID) {
			parent.map.displayPictureMarker();
			if(parent?.isMapWide()) {
				parent?.setUnfocusedVisible(false);
			}
		}
		else {
			parent.map.displayPictureMarker(e.detail.lon, e.detail.lat, parent.psv.getXY().x);
			if(parent?.isMapWide()) {
				parent?.setUnfocusedVisible(true);
			}
		}
	};
	parent.addEventListener("psv:picture-loading", onPicLoad);
	parent.addEventListener("psv:picture-loaded", onPicLoad);

	// Picture view rotated
	parent.addEventListener("psv:view-rotated", () => {
		let x = parent.psv.getPosition().yaw * (180 / Math.PI);
		x += parent.psv.getPictureOriginalHeading();
		parent.map._picMarker.setRotation(x);
	});

	// Picture preview
	parent.addEventListener("psv:picture-preview-started", e => {
		// Show marker corresponding to selection
		parent.map._picMarkerPreview
			.setLngLat(e.detail.coordinates)
			.setRotation(e.detail.direction || 0)
			.addTo(parent.map);
	});

	parent.addEventListener("psv:picture-preview-stopped", () => {
		parent.map._picMarkerPreview.remove();
	});

	parent.addEventListener("psv:picture-loaded", e => {
		if (parent.isWidthSmall() && parent._picPopup && e.detail.picId == parent._picPopup._picId) {
			parent._picPopup.remove();
		}
	});

	// Picture click
	parent.addEventListener("map:picture-click", e => {
		parent.select(e.detail.seqId, e.detail.picId);
		if(!parent.psv._myVTour.state.currentNode && parent?.setFocus) { parent.setFocus("pic"); }
	});

	// Sequence click
	parent.addEventListener("map:sequence-click", e => {
		parent._api.getPicturesAroundCoordinates(
			e.detail.coordinates.lat,
			e.detail.coordinates.lng,
			1,
			1,
			e.detail.seqId
		).then(results => {
			if(results?.features?.length > 0) {
				parent.select(results.features[0]?.collection, results.features[0].id);
				if(!parent.psv.getPictureMetadata() && parent?.setFocus) { parent.setFocus("pic"); }
			}
		});
	});
}

/**
 * Transforms a GeoJSON feature from the STAC API into a PSV node.
 * 
 * @param {object} f The API GeoJSON feature
 * @param {object} t The labels translations container
 * @param {boolean} [fastInternet] True if Internet speed is high enough for loading HD flat pictures
 * @param {function} [customLinkFilter] A function checking if a STAC link is acceptable to use for picture navigation
 * @return {object} A PSV node
 * @private
 */
export function apiFeatureToPSVNode(f, t, fastInternet=false, customLinkFilter=null) {
	const isHorizontalFovDefined = f.properties?.["pers:interior_orientation"]?.["field_of_view"] != null;
	let horizontalFov = isHorizontalFovDefined ? parseInt(f.properties["pers:interior_orientation"]["field_of_view"]) : 70;
	const is360 = horizontalFov === 360;

	const hdUrl = (Object.values(f.assets).find(a => a?.roles?.includes("data")) || {}).href;
	const matrix = f?.properties?.["tiles:tile_matrix_sets"]?.geovisio;
	const prev = f.links.find(l => l?.rel === "prev" && l?.type === "application/geo+json");
	const next = f.links.find(l => l?.rel === "next" && l?.type === "application/geo+json");
	const baseUrlWebp = Object.values(f.assets).find(a => a.roles?.includes("visual") && a.type === "image/webp");
	const baseUrlJpeg = Object.values(f.assets).find(a => a.roles?.includes("visual") && a.type === "image/jpeg");
	const baseUrl = (baseUrlWebp || baseUrlJpeg).href;
	const thumbUrl = (Object.values(f.assets).find(a => a.roles?.includes("thumbnail") && a.type === "image/jpeg"))?.href;
	const tileUrl = f?.asset_templates?.tiles_webp || f?.asset_templates?.tiles;
	const croppedPanoData = getCroppedPanoData(f);

	let panorama;

	// Cropped panorama
	if(!tileUrl && Object.keys(croppedPanoData).length > 0) {
		panorama = {
			baseUrl: fastInternet ? hdUrl : baseUrl,
			origBaseUrl: fastInternet ? hdUrl : baseUrl,
			hdUrl,
			thumbUrl,
			basePanoData: croppedPanoData,
			// This is only to mock loading of tiles (which are not available for flat pictures)
			cols: 2, rows: 1, width: 2, tileUrl: () => null
		};
	}
	// 360°
	else if(is360 && matrix) {
		panorama = {
			baseUrl,
			origBaseUrl: baseUrl,
			basePanoData: (img) => ({
				fullWidth: img.width,
				fullHeight: img.height,
			}),
			hdUrl,
			thumbUrl,
			cols: matrix && matrix.tileMatrix[0].matrixWidth,
			rows: matrix && matrix.tileMatrix[0].matrixHeight,
			width: matrix && (matrix.tileMatrix[0].matrixWidth * matrix.tileMatrix[0].tileWidth),
			tileUrl: matrix && ((col, row) => tileUrl.href.replace(/\{TileCol\}/g, col).replace(/\{TileRow\}/g, row))
		};
	}
	// Flat pictures: shown only using a cropped base panorama
	else {
		panorama = {
			baseUrl: fastInternet ? hdUrl : baseUrl,
			origBaseUrl: fastInternet ? hdUrl : baseUrl,
			hdUrl,
			thumbUrl,
			basePanoData: (img) => {
				if (img.width < img.height && !isHorizontalFovDefined) {
					horizontalFov = 35;
				}
				const verticalFov = horizontalFov * img.height / img.width;
				const panoWidth = img.width * 360 / horizontalFov;
				const panoHeight = img.height * 180 / verticalFov;

				return {
					fullWidth: panoWidth,
					fullHeight: panoHeight,
					croppedWidth: img.width,
					croppedHeight: img.height,
					croppedX: (panoWidth - img.width) / 2,
					croppedY: (panoHeight - img.height) / 2,
				};
			},
			// This is only to mock loading of tiles (which are not available for flat pictures)
			cols: 2, rows: 1, width: 2, tileUrl: () => null
		};
	}

	const node = {
		id: f.id,
		caption: getNodeCaption(f, t),
		panorama,
		links: filterRelatedPicsLinks(f, customLinkFilter),
		gps: f.geometry.coordinates,
		sequence: {
			id: f.collection,
			nextPic: next ? next.id : undefined,
			prevPic: prev ? prev.id : undefined
		},
		sphereCorrection: getSphereCorrection(f),
		horizontalFov,
		properties: f.properties,
	};
	
	return node;
}

/**
 * Filter surrounding pictures links to avoid too much arrows on viewer.
 * @private
 */
export function filterRelatedPicsLinks(metadata, customFilter = null) {
	const picLinks = metadata.links
		.filter(l => ["next", "prev", "related"].includes(l?.rel) && l?.type === "application/geo+json")
		.filter(l => customFilter ? customFilter(l) : true)
		.map(l => {
			if(l.datetime) {
				l.date = l.datetime.split("T")[0];
			}
			return l;
		});
	const picPos = metadata.geometry.coordinates;

	// Filter to keep a single link per direction, in same sequence or most recent one
	const filteredLinks = [];
	const picSurroundings = { "N": [], "ENE": [], "ESE": [], "S": [], "WSW": [], "WNW": [] };

	for(let picLink of picLinks) {
		const a = getSimplifiedAngle(picPos, picLink.geometry.coordinates);
		picSurroundings[a].push(picLink);
	}

	for(let direction in picSurroundings) {
		const picsInDirection = picSurroundings[direction];
		if(picsInDirection.length == 0) { continue; }
		picsInDirection.sort(sortPicturesInDirection(picPos));
		filteredLinks.push(picsInDirection.shift());
	}

	let arrowStyle = l => l.rel === "related" ? {
		element: getArrow(ArrowTurn),
		size: { width: 64*2/3, height: 192*2/3 }
	} : {
		element: getArrow(ArrowTriangle),
		size: { width: 75, height: 75 }
	};

	const rectifiedYaw = - (metadata.properties?.["view:azimuth"] || 0) * (Math.PI / 180);
	return filteredLinks.map(l => ({
		nodeId: l.id,
		gps: l.geometry.coordinates,
		arrowStyle: arrowStyle(l),
		linkOffset: { yaw: rectifiedYaw }
	}));
}

/**
 * Get the query string for JOSM to load current picture area
 * @returns {string} The query string, or null if not available
 * @private
 */
export function josmBboxParameters(meta) {
	if(meta) {
		const coords = meta.gps;
		const heading = meta?.properties?.["view:azimuth"];
		const delta = 0.0002;
		const values = {
			left: coords[0] - (heading === null || heading >= 180 ? delta : 0),
			right: coords[0] + (heading === null || heading <= 180 ? delta : 0),
			top: coords[1] + (heading === null || heading <= 90 || heading >= 270 ? delta : 0),
			bottom: coords[1] - (heading === null || (heading >= 90 && heading <= 270) ? delta : 0),
			changeset_source: "Panoramax"
		};
		return Object.entries(values).map(e => e.join("=")).join("&");
	}
	else { return null; }
}

/**
 * Check if code runs in an iframe or in a classic page.
 * @returns {boolean} True if running in iframe
 * @private
 */
export function isInIframe() {
	try {
		return window.self !== window.top;
	} catch(e) {
		return true;
	}
}


const INTERNET_FAST_THRESHOLD = 10; // MBit/s
const INTERNET_FAST_STORAGE = "gvs-internet-fast";
const INTERNET_FAST_TESTFILE = "https://panoramax.openstreetmap.fr/images/05/ca/2c/98/0111-4baf-b6f3-587bb8847d2e.jpg";

/**
 * Check if Internet connection is high-speed or not.
 * @returns {Promise} Resolves on true if high-speed.
 * @private
 */
export function isInternetFast() {
	// Check if downlink property is available
	try {
		const speed = navigator.connection.downlink; // MBit/s
		return Promise.resolve(speed >= INTERNET_FAST_THRESHOLD);
	}
	// Fallback for other browsers
	catch(e) {
		try {
			// Check if test has been done before and stored
			const isFast = sessionStorage.getItem(INTERNET_FAST_STORAGE);
			if(["true", "false"].includes(isFast)) {
				return Promise.resolve(isFast === "true");
			}

			// Run download testing
			const startTime = (new Date()).getTime();
			return fetch(INTERNET_FAST_TESTFILE+"?nocache="+startTime)
				.then(async res => [res, await res.blob()])
				.then(([res, blob]) => {
					const size = parseInt(res.headers.get("Content-Length") || blob.size); // Bytes
					const endTime = (new Date()).getTime();
					const duration = (endTime - startTime) / 1000; // Transfer time in seconds
					const speed = (size * 8 / 1024 / 1024) / duration; // MBits/s
					const isFast = speed >= INTERNET_FAST_THRESHOLD;
					sessionStorage.setItem(INTERNET_FAST_STORAGE, isFast ? "true" : "false");
					return isFast;
				})
				.catch(e => {
					console.warn("Failed to run speedtest", e);
					return false;
				});
		}
		// Fallback for browser blocking third-party downloads or sessionStorage
		catch(e) {
			return Promise.resolve(false);
		}
	}
}

/**
 * Get a cookie value
 * @param {str} name The cookie name
 * @returns {str} The cookie value, or null if not found
 * @private
 */
export function getCookie(name) {
	const parts = document.cookie
		?.split(";")
		?.find((row) => row.trimStart().startsWith(`${name}=`))
		?.split("=");
	if(!parts) { return undefined; }
	parts.shift();
	return parts.join("=");
}

/**
 * Checks if an user account exists
 * @returns {object} Object like {"id", "name"} or null if no authenticated account
 * @private
 */
export function getUserAccount() {
	const session = getCookie("session");
	const user_id = getCookie("user_id");
	const user_name = getCookie("user_name");

	return (session && user_id && user_name) ? { id: user_id, name: user_name } : null;
}
