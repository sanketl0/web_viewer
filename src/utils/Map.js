// DO NOT REMOVE THE "!": bundled builds breaks otherwise !!!
import maplibregl from "!maplibre-gl";
import LoaderImg from "../img/marker.svg";
import { COLORS, QUALITYSCORE_RES_FLAT_VALUES, QUALITYSCORE_RES_360_VALUES, QUALITYSCORE_GPS_VALUES, QUALITYSCORE_POND_RES, QUALITYSCORE_POND_GPS } from "./Utils";
import { autoDetectLocale } from "./I18n";

export const DEFAULT_TILES = "https://panoramax.openstreetmap.fr/pmtiles/basic.json";
export const RASTER_LAYER_ID = "gvs-aerial";
export const TILES_PICTURES_ZOOM = 15;
export const TILES_PICTURES_SYMBOL_ZOOM = 18;

export const VECTOR_STYLES = {
	PICTURES: {
		"paint": {
			"circle-radius": ["interpolate", ["linear"], ["zoom"],
				TILES_PICTURES_ZOOM, 4.5,
				TILES_PICTURES_SYMBOL_ZOOM, 6,
				24, 12
			],
			"circle-opacity": 1, // Always visible
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": ["interpolate", ["linear"], ["zoom"],
				TILES_PICTURES_ZOOM+1, 0,
				TILES_PICTURES_ZOOM+2, 1,
				TILES_PICTURES_SYMBOL_ZOOM, 1.5,
				24, 3
			],
		},
		"layout": {}
	},
	PICTURES_SYMBOLS: {
		"paint": {
			"icon-opacity": 1, // Always visible
		},
		"layout": {
			"icon-image": ["case", ["==", ["get", "type"], "equirectangular"], "gvs-arrow-360", "gvs-arrow-flat"],
			"icon-size": ["interpolate", ["linear"], ["zoom"], 
				TILES_PICTURES_SYMBOL_ZOOM, 0.5, 
				24, 1
			],
			"icon-rotate": ["to-number", ["get", "heading"]],
			"icon-allow-overlap": true,
		},
	},
	SEQUENCES: {
		"paint": {
			"line-width": ["interpolate", ["linear"], ["zoom"], 
				0, 0.5, 
				10, 2, 
				14, 4, 
				16, 5, 
				22, 3
			],
		},
		"layout": {
			"line-cap": "square",
		}
	},
	SEQUENCES_PLUS: {
		"paint": {
			"line-width": ["interpolate", ["linear"], ["zoom"], 
				0, 15, 
				TILES_PICTURES_ZOOM+1, 30, 
				TILES_PICTURES_ZOOM+2, 0
			],
			"line-opacity": 1, // Always visible
			"line-color": "#ff0000",
		},
		"layout": {
			"line-cap": "square",
		}
	}
};



// See MapLibre docs for explanation of expressions magic: https://maplibre.org/maplibre-style-spec/expressions/
const MAP_EXPR_QUALITYSCORE_RES_360  = ["case", ["has", "h_pixel_density"], ["step", ["get", "h_pixel_density"], ...QUALITYSCORE_RES_360_VALUES], 1];
const MAP_EXPR_QUALITYSCORE_RES_FLAT = ["case", ["has", "h_pixel_density"], ["step", ["get", "h_pixel_density"], ...QUALITYSCORE_RES_FLAT_VALUES], 1];
const MAP_EXPR_QUALITYSCORE_RES = [
	"case", ["==", ["get", "type"], "equirectangular"],
	MAP_EXPR_QUALITYSCORE_RES_360, MAP_EXPR_QUALITYSCORE_RES_FLAT
];
const MAP_EXPR_QUALITYSCORE_GPS = ["case", ["has", "gps_accuracy"], ["step", ["get", "gps_accuracy"], ...QUALITYSCORE_GPS_VALUES], 1];
// Note: score is also calculated in widgets/popup code
export const MAP_EXPR_QUALITYSCORE = [
	"round",
	["+",
		["*", MAP_EXPR_QUALITYSCORE_RES, QUALITYSCORE_POND_RES],
		["*", MAP_EXPR_QUALITYSCORE_GPS, QUALITYSCORE_POND_GPS]]
];


/**
 * Get the GIF shown while thumbnail loads
 * @param {object} lang Translations
 * @returns The DOM element for this GIF
 * @private
 */
export function getThumbGif(lang) {
	const thumbGif = document.createElement("img");
	thumbGif.src = LoaderImg;
	thumbGif.alt = lang.loading;
	thumbGif.title = lang.loading;
	thumbGif.classList.add("gvs-map-thumb", "gvs-map-thumb-loader");
	return thumbGif;
}

/**
 * Is given layer a label layer.
 * 
 * This is useful for inserting new vector layer before labels in MapLibre.
 * @param {object} l The layer to check
 * @returns {boolean} True if it's a label layer
 * @private
 */
export function isLabelLayer(l) {
	return l.type === "symbol"
		&& l?.layout?.["text-field"]
		&& (l.minzoom === undefined || l.minzoom < 15);
}

/**
 * Create all-in-one map style for MapLibre GL JS
 * 
 * @param {CoreView} parent The parent view
 * @param {object} options Options from Map component
 * @param {object} [options.raster] The MapLibre raster source for aerial background. This must be a JSON object following [MapLibre raster source definition](https://maplibre.org/maplibre-style-spec/sources/#raster).
 * @param {string} [options.background] Choose default map background to display (streets or aerial, if raster aerial background available). Defaults to street.
 * @param {object} [options.supplementaryStyle] Additional style properties (completing CoreView style and STAC API style)
 * @returns {object} The full MapLibre style
 * @private
 */
export function combineStyles(parent, options) {
	// Get basic vector styles
	const style = parent._api.getMapStyle();
	
	// Complete styles
	style.layers = style.layers.concat(getMissingLayerStyles(style.sources, style.layers));
	if(!style.metadata) { style.metadata = {}; }

	// Complementary style
	if(options.supplementaryStyle) {
		Object.assign(style.sources, options.supplementaryStyle.sources || {});
		Object.assign(style.metadata, options.supplementaryStyle.metadata || {});
		style.layers = style.layers.concat(options.supplementaryStyle.layers || []);
	}

	// Aerial imagery background
	if(options.raster) {
		style.sources["gvs-aerial"] = options.raster;
		style.layers.push({
			"id": RASTER_LAYER_ID,
			"type": "raster",
			"source": "gvs-aerial",
			"layout": {
				"visibility": options.background === "aerial" ? "visible" : "none",
			}
		});
	}

	// Filter out general tiles if necessary
	if(!parent._options?.users?.includes("geovisio")) {
		style.layers.forEach(l => {
			if(l.source === "geovisio") {
				if(!l.layout) { l.layout = {}; }
				l.layout.visibility = "none";
			}
		});
	}

	// Order layers (base, geovisio, labels)
	style.layers.sort((a,b) => {
		if(isLabelLayer(a) && !isLabelLayer(b)) { return 1; }
		else if(!isLabelLayer(a) && isLabelLayer(b)) { return -1; }
		else {
			if(a.id.startsWith("geovisio") && !b.id.startsWith("geovisio")) { return 1; }
			else if(!a.id.startsWith("geovisio") && b.id.startsWith("geovisio")) { return -1; }
			else {
				if(a.id.endsWith("_pictures") && !b.id.endsWith("_pictures")) { return 1; }
				if(!a.id.endsWith("_pictures") && b.id.endsWith("_pictures")) { return -1; }
				else { return 0; }
			}
		}
	});

	// TODO : remove override once available in default Panoramax style
	if(!style.metadata?.["panoramax:locales"]) {
		style.metadata["panoramax:locales"] = ["fr", "en", "de", "es", "ru", "pt", "zh", "hi", "latin"];
	}

	// Override labels to use appropriate language
	if(style.metadata["panoramax:locales"]) {
		let prefLang = parent._options.lang || autoDetectLocale(style.metadata["panoramax:locales"], "latin");
		if(prefLang.includes("-")) { prefLang = prefLang.split("-")[0]; }
		if(prefLang.includes("_")) { prefLang = prefLang.split("_")[0]; }
		style.layers.forEach(l => {
			if(isLabelLayer(l) && l.layout["text-field"].includes("name:latin")) {
				l.layout["text-field"] = [
					"coalesce",
					["get", `name:${prefLang}`],
					["get", "name:latin"],
					["get", "name"]
				];
			}
		});
	}

	// Fix for capital cities
	const citiesLayer = style.layers.find(l => l.id == "place_label_city");
	let capitalLayer = style.layers.find(l => l.id == "place_label_capital");
	if(citiesLayer && !capitalLayer) {
		// Create capital layer from original city style
		citiesLayer.paint = {
			"text-color": "hsl(0, 0%, 0%)",
			"text-halo-blur": 0,
			"text-halo-color": "hsla(0, 0%, 100%, 1)",
			"text-halo-width": 3,
		};
		citiesLayer.layout["text-letter-spacing"] = 0.1;
		capitalLayer = JSON.parse(JSON.stringify(citiesLayer));
		capitalLayer.id = "place_label_capital";
		capitalLayer.filter.push(["<=", "capital", 2]);

		// Edit original city to make it less import
		citiesLayer.filter.push([">", "capital", 2]);
		style.layers.push(capitalLayer);
	}

	return style;
}

/**
 * Identifies missing layers for a complete rendering of GeoVisio vector tiles.
 * This allows retro-compatibility with GeoVisio instances <= 2.5.0
 *   which didn't offer a MapLibre JSON style directly.
 * 
 * @param {object} sources Pre-existing MapLibre style sources
 * @param {object} layers Pre-existing MapLibre style layers
 * @returns List of layers to add
 * @private
 */
export function getMissingLayerStyles(sources, layers) {
	const newLayers = [];

	// GeoVisio API <= 2.5.0 : add sequences + pictures
	Object.keys(sources).filter(s => (
		layers.find(l => l?.source === s) === undefined
	)).forEach(s => {
		if(s.startsWith("geovisio")) {
			// Basic sequences
			newLayers.push({
				"id": `${s}_sequences`,
				"type": "line",
				"source": s,
				"source-layer": "sequences",
				"layout": {
					...VECTOR_STYLES.SEQUENCES.layout
				},
				"paint": {
					...VECTOR_STYLES.SEQUENCES.paint,
					"line-color": COLORS.BASE,
				},
			});

			// Padded sequence (for easier click)
			newLayers.push({
				"id": `${s}_sequences_plus`,
				"type": "line",
				"source": s,
				"source-layer": "sequences",
				"layout": {
					...VECTOR_STYLES.SEQUENCES_PLUS.layout
				},
				"paint": {
					...VECTOR_STYLES.SEQUENCES_PLUS.paint
				},
			});

			// Pictures symbols
			newLayers.push({
				"id": `${s}_pictures_symbols`,
				"type": "symbol",
				"source": s,
				"source-layer": "pictures",
				...VECTOR_STYLES.PICTURES_SYMBOLS,
			});

			// Pictures symbols
			newLayers.push({
				"id": `${s}_pictures_symbols`,
				"type": "symbol",
				"source": s,
				"source-layer": "pictures",
				...VECTOR_STYLES.PICTURES_SYMBOLS,
			});

			// Pictures
			newLayers.push({
				"id": `${s}_pictures`,
				"type": "circle",
				"source": s,
				"source-layer": "pictures",
				"layout": {
					...VECTOR_STYLES.PICTURES.layout
				},
				"paint": {
					...VECTOR_STYLES.PICTURES.paint,
					"circle-color": COLORS.BASE,
				},
			});
		}
	});

	// Add sequences_plus for easier click on map
	layers.filter(l => (
		l?.id?.endsWith("_sequences")
		&& layers.find(sl => sl?.id === l.id+"_plus") === undefined
	)).forEach(l => {
		newLayers.push({
			"id": `${l.id}_plus`,
			"type": "line",
			"source": l.source,
			"source-layer": l["source-layer"],
			"layout": {
				...VECTOR_STYLES.SEQUENCES_PLUS.layout
			},
			"paint": {
				...VECTOR_STYLES.SEQUENCES_PLUS.paint
			},
		});
	});

	// Add pictures symbol for high-level zooms
	layers.filter(l => (
		l?.id?.endsWith("_pictures")
		&& layers.find(sl => sl?.id === l.id+"_symbols") === undefined
	)).forEach(l => {
		// Symbols
		newLayers.unshift({
			"id": `${l.id}_symbols`,
			"type": "symbol",
			"source": l.source,
			"source-layer": "pictures",
			...VECTOR_STYLES.PICTURES_SYMBOLS,
		});

		// Patch style of pictures layer
		l.paint = Object.assign(l.paint || {}, VECTOR_STYLES.PICTURES.paint);
		l.layout = Object.assign(l.layout || {}, VECTOR_STYLES.PICTURES.layout);
	});

	return newLayers;
}

/**
 * Get cleaned-up layer ID for a specific user.
 * @param {string} userId The user UUID (or "geovisio" for general layer)
 * @param {string} layerType The kind of layer (pictures, sequences...)
 * @returns {string} The cleaned-up layer ID for MapLibre
 * @private
 */
export function getUserLayerId(userId, layerType) {
	return `${getUserSourceId(userId)}_${layerType}`;
}

/**
 * Get cleaned-up source ID for a specific user.
 * @param {string} userId The user UUID (or "geovisio" for general layer)
 * @returns {string} The cleaned-up source ID for MapLibre
 * @private
 */
export function getUserSourceId(userId) {
	return userId === "geovisio" ? "geovisio" : "geovisio_"+userId;
}

/**
 * Switches used coef value in MapLibre style JSON expression
 * @param {*} expr The MapLibre style expression
 * @param {string} newCoefVal The new coef value to use
 * @returns {*} The switched expression
 * @private
 */
export function switchCoefValue(expr, newCoefVal) {
	if(Array.isArray(expr)) {
		return expr.map(v => switchCoefValue(v, newCoefVal));
	}
	else if(typeof expr === "object" && expr !== null) {
		const newExpr = {};
		for (const key in expr) {
			newExpr[key] = switchCoefValue(expr[key], newCoefVal);
		}
		return newExpr;
	}
	else if(typeof expr === "string" && expr.startsWith("coef")) {
		return newCoefVal;
	}
	return expr;
}

/**
 * Transforms a set of parameters into an URL-ready string
 * It also removes null/undefined values
 *
 * @param {object} params The parameters object
 * @return {string} The URL query part
 * @private
 */
export function geocoderParamsToURLString(params) {
	let p = {};
	Object.entries(params)
		.filter(e => e[1] !== undefined && e[1] !== null)
		.forEach(e => p[e[0]] = e[1]);

	return new URLSearchParams(p).toString();
}

/**
 * Nominatim (OSM) geocoder, ready to use for our Map
 * @private
 */
export function forwardGeocodingNominatim(config) {
	// Transform parameters into Nominatim format
	const params = {
		q: config.query,
		countrycodes: config.countries,
		limit: config.limit,
		viewbox: config.bbox,
	};

	return fetch(`https://nominatim.openstreetmap.org/search?${geocoderParamsToURLString(params)}&format=geojson&polygon_geojson=1&addressdetails=1`)
		.then(res => res.json())
		.then(res => {
			const finalRes = { features: [] };
			const listedNames = [];
			res.features.forEach(f => {
				if(!listedNames.includes(f.properties.display_name)) {
					finalRes.features.push({
						place_type: ["place"],
						place_name: f.properties.display_name,
						bounds: new maplibregl.LngLatBounds(f.bbox),
					});
					listedNames.push(f.properties.display_name);
				}
			});
			return finalRes;
		});
}

/**
 * Base adresse nationale (FR) geocoder, ready to use for our Map
 * @param {object} config Configuration sent by MapLibre GL Geocoder, following the geocoderApi format ( https://github.com/maplibre/maplibre-gl-geocoder/blob/main/API.md#setgeocoderapi )
 * @returns {object} GeoJSON Feature collection in Carmen GeoJSON format
 * @private
 */
export function forwardGeocodingBAN(config) {
	// Transform parameters into BAN format
	const params = { q: config.query, limit: config.limit };
	if(typeof config.proximity === "string") {
		const [lat, lon] = config.proximity.split(",").map(v => parseFloat(v.trim()));
		params.lat = lat;
		params.lon = lon;
	}

	const toPlaceName = p => [p.name, p.district, p.city].filter(v => v).join(", ");
	const placeTypeToZoom =  { "housenumber": 20, "street": 18, "locality": 15, "municipality": 12 };
	
	return fetch(`https://api-adresse.data.gouv.fr/search/?${geocoderParamsToURLString(params)}`)
		.then(res => res.json())
		.then(res => {
			res.features = res.features.map(f => ({
				place_type: ["place"],
				place_name: toPlaceName(f.properties),
				center: new maplibregl.LngLat(...f.geometry.coordinates),
				zoom: placeTypeToZoom[f.properties.type],
			}));
			return res;
		});
}