import "./Map.css";
import {
	forwardGeocodingBAN, forwardGeocodingNominatim, VECTOR_STYLES,
	TILES_PICTURES_ZOOM, getThumbGif, RASTER_LAYER_ID, combineStyles,
	getMissingLayerStyles, isLabelLayer, getUserLayerId, getUserSourceId, switchCoefValue,
} from "../utils/Map";
import { COLORS } from "../utils/Utils";
import MarkerBaseSVG from "../img/marker.svg";
import MarkerSelectedSVG from "../img/marker_blue.svg";
import ArrowFlatSVG from "../img/arrow_flat.svg";
import Arrow360SVG from "../img/arrow_360.svg";

// MapLibre imports
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "!maplibre-gl"; // DO NOT REMOVE THE "!": bundled builds breaks otherwise !!!
import maplibreglWorker from "maplibre-gl/dist/maplibre-gl-csp-worker";
import * as pmtiles from "pmtiles";
maplibregl.workerClass = maplibreglWorker;
maplibregl.addProtocol("pmtiles", new pmtiles.Protocol().tile);

const MAPLIBRE_OPTIONS = [	// No "style" option as it's handled by combineStyles function
	"antialias", "attributionControl", "bearing", "bearingSnap", "bounds",
	"boxZoom", "center", "clickTolerance", "collectResourceTiming",
	"cooperativeGestures", "crossSourceCollisions", "doubleClickZoom", "dragPan",
	"dragRotate", "fadeDuration", "failIfMajorPerformanceCaveat", "fitBoundsOptions",
	"hash", "interactive", "keyboard", "localIdeographFontFamily", "locale", "logoPosition",
	"maplibreLogo", "maxBounds", "maxCanvasSize", "maxPitch", "maxTileCacheSize",
	"maxTileCacheZoomLevels", "maxZoom", "minPitch", "minZoom", "pitch", "pitchWithRotate",
	"pixelRatio", "preserveDrawingBuffer", "refreshExpiredTiles", "renderWorldCopies",
	"scrollZoom", "touchPitch", "touchZoomRotate", "trackResize",
	"transformCameraUpdate", "transformRequest", "validateStyle", "zoom"
];
const filterMapLibreOptions = opts => Object.fromEntries(Object.entries(opts).filter(([key]) => MAPLIBRE_OPTIONS.includes(key)));


/**
 * Map is the component showing pictures and sequences geolocation.
 * 
 * Note that all functions of [MapLibre GL JS class Map](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) are also available.
 * 
 * @param {CoreView} parent The parent view
 * @param {Element} container The DOM element to create into
 * @param {object} [options] The map options (any of [MapLibre GL settings](https://maplibre.org/maplibre-gl-js-docs/api/map/#map-parameters) or any supplementary option defined here)
 * @param {object} [options.raster] The MapLibre raster source for aerial background. This must be a JSON object following [MapLibre raster source definition](https://maplibre.org/maplibre-style-spec/sources/#raster).
 * @param {string} [options.background] Choose default map background to display (streets or aerial, if raster aerial background available). Defaults to street.
 * @param {object} [options.geocoder] Optional geocoder settings
 * @param {string} [options.geocoder.engine] Set the geocoder engine to use (nominatim, ban)
 */
export default class Map extends maplibregl.Map {
	constructor(parent, container, options = {}) {
		super({
			container: container,
			style: combineStyles(parent, options),
			center: [0,0],
			zoom: 0,
			maxZoom: 24,
			attributionControl: false,
			dragRotate: false,
			pitchWithRotate: false,
			touchZoomRotate: true,
			touchPitch: false,
			preserveDrawingBuffer: !parent.isWidthSmall(),
			transformRequest: parent._api._getMapRequestTransform(),
			locale: parent._t.maplibre,
			...filterMapLibreOptions(options)
		});
		this._loadMarkerImages();

		this._parent = parent;
		this._options = options;
		this.getContainer().classList.add("gvs-map");

		// Disable touch rotate
		if(options.touchZoomRotate === undefined) {
			this?.touchZoomRotate?.disableRotation();
		}

		// Handle raster source
		if(this._options.raster) {
			this._options.background = this._options.background || "streets";
		}

		this._attribution = new maplibregl.AttributionControl({ compact: false });
		this.addControl(this._attribution);

		this._initGeocoder();
		this._initMapPosition();

		// Widgets and markers
		this._picMarker = this._getPictureMarker();
		this._picMarkerPreview = this._getPictureMarker(false);

		// Cache for pictures and sequences thumbnails
		this._picThumbUrl = {};
		this._seqPictures = {};

		// Sequences and pictures per users
		this._userLayers = new Set();

		// Hover event
		this.on("mousemove", "sequences", this._onSequenceHover.bind(this));

		// Parent selection
		this._parent.addEventListener("select", this.reloadLayersStyles.bind(this));

		// Timeout for initial loading
		setTimeout(() => {
			if(!this.loaded() && this._parent._loader.isVisible()) {
				this._parent._loader.dismiss({}, this._parent._t.map.slow_loading, () => {});
			}
		}, 15000);

		this.waitForEnoughMapLoaded().then(async () => await this._postLoad());
	}

	/**
	 * @private
	 */
	async _postLoad() {
		this.resize();
		await this.setVisibleUsers(this._parent._options.users);
		this.reloadLayersStyles();
	}

	/**
	 * Destroy any form of life in this component
	 */
	destroy() {
		this.remove();
		delete this._parent;
		delete this._options;
		delete this._attribution;
		delete this._picMarker;
		delete this._picMarkerPreview;
		delete this._picThumbUrl;
		delete this._seqPictures;
		delete this._userLayers;
	}

	/**
	 * Helper to know when enough map background and Panoramax tiles are loaded for a proper display.
	 * @returns {Promise} Resolves when enough is loaded
	 */
	waitForEnoughMapLoaded() {
		return new Promise((resolve) => {
			let nbBgTiles = 0;
			let nbFgTiles = 0;
			let nbLoadedBgTiles = 0;
			let nbLoadedFgTiles = 0;

			const onSourceDataLoading = e => {
				if(e.dataType === "source" && e.tile) {
					if(e.sourceId.startsWith("geovisio")) {
						nbFgTiles++;
					}
					else {
						nbBgTiles++;
					}
				}
			};
			const onSourceData = e => {
				if(e.dataType === "source" && e.tile) {
					if(e.sourceId.startsWith("geovisio")) {
						nbLoadedFgTiles++;
						if(e.isSourceLoaded) { nbLoadedFgTiles = nbFgTiles; }
					}
					else {
						nbLoadedBgTiles++;
						if(e.isSourceLoaded) { nbLoadedBgTiles = nbBgTiles; }
					}
				}
				checkEnoughLoaded();
			};

			const checkEnoughLoaded = () => {
				if(nbLoadedBgTiles / nbBgTiles >= 0.75 && nbLoadedFgTiles / nbFgTiles >= 0.75) {
					this.off("sourcedata", onSourceData);
					this.off("sourcedataloading", onSourceDataLoading);
					resolve();
				}
			};

			this.on("sourcedataloading", onSourceDataLoading);
			this.on("sourcedata", onSourceData);
		});
	}

	/**
	 * Sets map view based on returned API bbox (if no precise option given by user).
	 * @private
	 */
	_initMapPosition() {
		if(
			(!this._options.center || this._options.center == [0,0])
			&& (!this._options.zoom || this._options.zoom === 0)
			&& (!this._options.hash)
		) {
			this._parent._api.onceReady().then(() => {
				let bbox = this._parent?._api?.getDataBbox();
				if(bbox) {
					try {
						bbox = new maplibregl.LngLatBounds(bbox);
						if(this.loaded()) { this.fitBounds(bbox, { "animate": false }); }
						else { this.waitForEnoughMapLoaded().then(() => this.fitBounds(bbox, { "animate": false })); }
					}
					catch(e) {
						console.warn("Received invalid bbox: "+bbox);
					}
				}
			});
		}
	}

	/**
	 * Creates the geocoder search bar
	 * @private
	 */
	_initGeocoder() {
		const engines = { "ban": forwardGeocodingBAN, "nominatim": forwardGeocodingNominatim };
		const engine = this._options?.geocoder?.engine || "nominatim";
		this.geocoder = engines[engine];
		this._geolocate = new maplibregl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true,
				timeout: 60000, // Max 1 minute for first position
				maximumAge: 300000, // Accepts 5 minutes old position
			},
			showAccuracyCircle: true,
			showUserLocation: true,
			trackUserLocation: true,
		}).onAdd(this);
	}

	/**
	 * Load markers into map for use in map layers.
	 * @private
	 */
	_loadMarkerImages() {
		[
			{ id: "gvs-marker", img: MarkerBaseSVG },
			{ id: "gvs-arrow-flat", img: ArrowFlatSVG },
			{ id: "gvs-arrow-360", img: Arrow360SVG },
		].forEach(m => {
			const img = new Image(64, 64);
			img.onload = () => this.addImage(m.id, img);
			img.src = m.img;
		});
	}

	/**
	 * Is Quality Score available in vector tiles ?
	 * @private
	 */
	_hasQualityScore() {
		const fields = this.getStyle()?.metadata?.["panoramax:fields"] || {};
		return fields?.pictures?.includes("gps_accuracy") && fields?.pictures?.includes("h_pixel_density");
	}

	/**
	 * Are 360/flat pictures stats available in vector tiles for grid layer ?
	 * @private
	 */
	_hasGridStats() {
		const fields = this.getStyle()?.metadata?.["panoramax:fields"] || {};
		return fields?.grid?.includes("nb_360_pictures") && fields?.grid?.includes("nb_flat_pictures")
			&& fields?.grid?.includes("coef_360_pictures") && fields?.grid?.includes("coef_flat_pictures");
	}

	/**
	 * Force refresh of vector tiles data
	 */
	reloadVectorTiles() {
		[...this._userLayers].forEach(dl => {
			const s = this.getSource(getUserSourceId(dl));
			s.setTiles(s.tiles);
		});
	}

	/**
	 * Check if map offers aerial imagery as well as streets rendering.
	 * @returns {boolean} True if aerial imagery is available for display
	 */
	hasTwoBackgrounds() {
		return this.getLayer(RASTER_LAYER_ID) !== undefined;
	}

	/**
	 * Get the currently selected map background
	 * @returns {string} aerial or streets
	 */
	getBackground() {
		if(!this.getLayer(RASTER_LAYER_ID)) {
			return "streets";
		}

		const aerialVisible = this.getLayoutProperty(RASTER_LAYER_ID, "visibility") == "visible";
		return aerialVisible ? "aerial" : "streets";
	}

	/**
	 * Change the shown background in map.
	 * @param {string} bg The new background to display (aerial or streets)
	 */
	setBackground(bg) {
		if(!this.getLayer(RASTER_LAYER_ID) && bg === "aerial") { throw new Error("No aerial imagery available"); }
		if(this.getLayer(RASTER_LAYER_ID)) {
			this.setLayoutProperty(RASTER_LAYER_ID, "visibility", bg === "aerial" ? "visible" : "none");

			/**
			 * Event for map background changes
			 *
			 * @event map:background-changed
			 * @memberof CoreView
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} [detail.background] The new selected background (aerial, streets)
			 */
			const event = new CustomEvent("map:background-changed", { detail: { background: bg || "streets" }});
			this._parent.dispatchEvent(event);
		}
	}

	/**
	 * Get the currently visible users
	 * @returns {string[]} List of visible users
	 */
	getVisibleUsers() {
		return [...this._userLayers].filter(l => (
			this.getLayoutProperty(getUserLayerId(l, "pictures"), "visibility") === "visible"
		));
	}

	/**
	 * Make given user layers visible on map, and hide all others (if any)
	 * 
	 * @param {string|string[]} visibleIds The user layers IDs to display
	 */
	async setVisibleUsers(visibleIds = []) {
		if(typeof visibleIds === "string") { visibleIds = [visibleIds]; }

		// Create any missing user layer
		await Promise.all(
			visibleIds
				.filter(id => id != "" && !this._userLayers.has(id))
				.map(id => this._createPicturesTilesLayer(id))
		);

		// Switch visibility
		const layersSuffixes = ["pictures", "sequences", "sequences_plus", "grid", "pictures_symbols"];
		[...this._userLayers].forEach(l => {
			layersSuffixes.forEach(suffix => {
				const layerId = getUserLayerId(l, suffix);
				if(this.getLayer(layerId)) {
					this.setLayoutProperty(layerId, "visibility", visibleIds.includes(l) ? "visible" : "none");		
				}
			});
		});

		/**
		 * Event for visible users changes
		 *
		 * @event map:users-changed
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string[]} [detail.usersIds] The list of newly selected users
		 */
		const event = new CustomEvent("map:users-changed", { detail: { usersIds: visibleIds }});
		this._parent.dispatchEvent(event);
	}

	/**
	 * Filter the visible data content in all visible map layers
	 * @param {string} dataType sequences or pictures
	 * @param {object} filter The MapLibre GL filter rule to apply
	 */
	filterUserLayersContent(dataType, filter) {
		[...this._userLayers].forEach(l => {
			this.setFilter(getUserLayerId(l, dataType), filter);
			if(dataType === "sequences" && this.getLayer(getUserLayerId(l, "sequences_plus"))) {
				this.setFilter(getUserLayerId(l, "sequences_plus"), filter);
			}
			if(dataType === "pictures" && this.getLayer(getUserLayerId(l, "pictures_symbols"))) {
				this.setFilter(getUserLayerId(l, "pictures_symbols"), filter);
			}
		});
	}

	/**
	 * Shows on map a picture position and heading.
	 * 
	 * @param {number} lon The longitude
	 * @param {number} lat The latitude
	 * @param {number} heading The heading
	 */
	displayPictureMarker(lon, lat, heading) {
		this._picMarkerPreview.remove();

		// Show marker corresponding to selection
		if(lon !== undefined && lat !== undefined) {
			this._picMarker
				.setLngLat([lon, lat])
				.setRotation(heading)
				.addTo(this);
		}
		else {
			this._picMarker.remove();
		}
		
		// Update map style to see selected sequence
		this.reloadLayersStyles();

		// Move map to picture coordinates
		if(lon !== undefined && lat !== undefined) {
			this.flyTo({
				center: [lon, lat],
				zoom: this.getZoom() < TILES_PICTURES_ZOOM+2 ? TILES_PICTURES_ZOOM+2 : this.getZoom(),
				maxDuration: 2000
			});
		}
	}

	/**
	 * Forces reload of pictures/sequences layer styles.
	 * This is useful after a map theme change.
	 */
	reloadLayersStyles() {
		const updateStyle = (layer, style) => {
			[...this._userLayers].forEach(l => {
				for(let p in style.layout) {
					this.setLayoutProperty(getUserLayerId(l, layer), p, style.layout[p]);
				}
				for(let p in style.paint) {
					this.setPaintProperty(getUserLayerId(l, layer), p, style.paint[p]);
				}
			});
		};
		["pictures", "pictures_symbols", "sequences"].forEach(l => {
			updateStyle(l, this._getLayerStyleProperties(l));
		});

		// Also handle the grid stats
		if(this._hasGridStats() && this._parent?._mapFilters) {
			let newType = "coef";
			if(this._parent._mapFilters?.type) {
				newType = this._parent._mapFilters.type == "flat" ? "coef_flat_pictures" : "coef_360_pictures";
			}
			this.getStyle().layers
				.filter(l => l.id.endsWith("_grid"))
				.forEach(l => {
					const newl = switchCoefValue(l, newType);
					for(let p in newl.layout) {
						this.setLayoutProperty(l.id, p, newl.layout[p]);
					}
					for(let p in newl.paint) {
						this.setPaintProperty(l.id, p, newl.paint[p]);
					}
				});
		}
	}

	/**
	 * Creates source and layers for pictures and sequences.
	 * @private
	 * @param {string} id The source and layer ID prefix
	 */
	async _createPicturesTilesLayer(id) {
		this._userLayers.add(id);
		const firstLabelLayerId = this.getStyle().layers.find(isLabelLayer);

		// Load style from API
		if(id !== "geovisio" && !this.getSource(`geovisio_${id}`)) {
			const style = await this._parent._api.getUserMapStyle(id);
			Object.entries(style.sources).forEach(([sId, s]) => this.addSource(sId, s));
			style.layers = style.layers || [];
			const layers = style.layers.concat(getMissingLayerStyles(style.sources, style.layers));
			layers.filter(l => Object.keys(l).length > 0).forEach(l => this.addLayer(l, firstLabelLayerId?.id));
		}

		// Map interaction events
		// Popup
		this._picPreviewTimer = null;
		this._picPopup = new maplibregl.Popup({
			closeButton: false,
			closeOnClick: !this._parent.isWidthSmall(),
			offset: 3
		});
		this._picPopup.on("close", () => { delete this._picPopup._picId; });

		// Pictures
		const picLayerId = getUserLayerId(id, "pictures");
		this.on("mousemove", picLayerId, e => {
			this.getCanvas().style.cursor = "pointer";
			const eCopy = Object.assign({}, e);
			clearTimeout(this._picPreviewTimer);
			this._picPreviewTimer = setTimeout(
				() => this._attachPreviewToPictures(eCopy, picLayerId),
				100
			);
		});

		this.on("mouseleave", picLayerId, () => {
			clearTimeout(this._picPreviewTimer);
			this.getCanvas().style.cursor = "";
			this._picPopup._picId;
			this._picPopup.remove();
		});

		this.on("click", picLayerId, this._onPictureClick.bind(this));

		// Sequences
		const seqPlusLayerId = getUserLayerId(id, "sequences_plus");
		this.on("mousemove", seqPlusLayerId, e => {
			if(this.getZoom() <= TILES_PICTURES_ZOOM+1) {
				this.getCanvas().style.cursor = "pointer";
				if(e.features[0].properties.id) {
					const eCopy = Object.assign({}, e);
					clearTimeout(this._picPreviewTimer);
					this._picPreviewTimer = setTimeout(
						() => this._attachPreviewToPictures(eCopy, seqPlusLayerId),
						100
					);
				}
			}
		});

		this.on("mouseleave", seqPlusLayerId, () => {
			clearTimeout(this._picPreviewTimer);
			this.getCanvas().style.cursor = "";
			this._picPopup._picId;
			this._picPopup.remove();
		});

		this.on("click", seqPlusLayerId, e => {
			e.preventDefault();
			if(this.getZoom() <= TILES_PICTURES_ZOOM+1) {
				this._onSequenceClick(e);
			}
		});

		// Grid
		if(id === "geovisio" && this.getLayer("geovisio_grid")) {
			this.on("mousemove", "geovisio_grid", e => {
				if(this.getZoom() <= TILES_PICTURES_ZOOM+1) {
					this.getCanvas().style.cursor = "pointer";
					const eCopy = Object.assign({}, e);
					clearTimeout(this._picPreviewTimer);
					this._picPreviewTimer = setTimeout(
						() => this._attachPreviewToPictures(eCopy, "geovisio_grid"),
						100
					);
				}
			});
	
			this.on("mouseleave", "geovisio_grid", () => {
				clearTimeout(this._picPreviewTimer);
				this.getCanvas().style.cursor = "";
				this._picPopup._picId;
				this._picPopup.remove();
			});
	
			this.on("click", "geovisio_grid", e => {
				e.preventDefault();
				this.flyTo({ center: e.lngLat, zoom: TILES_PICTURES_ZOOM-6 });
			});
		}

		// Map background click
		this.on("click", (e) => {
			if(e.defaultPrevented === false) {
				clearTimeout(this._picPreviewTimer);
				this._picPopup.remove();
			}
		});
	}

	/**
	 * MapLibre paint/layout properties for specific layer
	 * This is useful when selected picture changes to allow partial update
	 *
	 * @returns {object} Paint/layout properties
	 * @private
	 */
	_getLayerStyleProperties(layer) {
		if(layer === "pictures_symbols") {
			return {
				"paint": {},
				"layout": {
					"icon-image": ["case",
						["==", ["get", "id"], this._parent._selectedPicId], "",
						["==", ["get", "type"], "equirectangular"], "gvs-arrow-360",
						"gvs-arrow-flat"
					],
					"symbol-sort-key": this._getLayerSortStyle(layer),
				},
			};
		}
		else {
			const prefixes = {
				"pictures": "circle",
				"sequences": "line",
			};
			return {
				"paint": Object.assign({
					[`${prefixes[layer]}-color`]: this._getLayerColorStyle(layer),
				}, VECTOR_STYLES[layer.toUpperCase()].paint),
				"layout": Object.assign({
					[`${prefixes[layer]}-sort-key`]: this._getLayerSortStyle(layer),
				}, VECTOR_STYLES[layer.toUpperCase()].layout)
			};
		}
	}

	/**
	 * Retrieve map layer color scheme according to selected theme.
	 * @private
	 */
	_getLayerColorStyle(layer) {
		// Hidden style
		const s = ["case",
			["==", ["get", "hidden"], true], COLORS.HIDDEN,
			["==", ["get", "geovisio:status"], "hidden"], COLORS.HIDDEN,
		];

		// Selected sequence style
		const seqId = this._parent._selectedSeqId;
		if(layer == "sequences" && seqId) {
			s.push(["==", ["get", "id"], seqId], COLORS.SELECTED);
		}
		else if(layer.startsWith("pictures") && seqId) {
			s.push(["in", seqId, ["get", "sequences"]], COLORS.SELECTED);
		}
		
		// Classic style
		s.push(COLORS.BASE);

		return s;
	}

	/**
	 * Retrieve map sort key according to selected theme.
	 * @private
	 */
	_getLayerSortStyle(layer) {
		// Values
		//  - 100 : on top / selected feature
		//  - 90  : hidden feature
		//  - 20-80 : custom ranges
		//  - 10  : basic feature
		//  - 0   : on bottom / feature with undefined property
		// Hidden style
		const s = ["case",
			["==", ["get", "hidden"], true], 90
		];

		// Selected sequence style
		const seqId = this._parent._selectedSeqId;
		if(layer == "sequences" && seqId) {
			s.push(["==", ["get", "id"], seqId], 100);
		}
		else if(layer.startsWith("pictures") && seqId) {
			s.push(["in", seqId, ["get", "sequences"]], 100);
		}

		s.push(10);
		return s;
	}

	/**
	 * Creates popup manager for preview of pictures.
	 * @private
	 * @param {object} e The event thrown by MapLibre
	 * @param {string} from The event source layer
	 */
	_attachPreviewToPictures(e, from) {
		let f = e.features.pop();
		if(!f || f.properties.id == this._picPopup._picId) { return; }

		let coordinates = null;
		if(from.endsWith("pictures")) { coordinates = f.geometry.coordinates.slice(); }
		else if(e.lngLat) { coordinates = [e.lngLat.lng, e.lngLat.lat]; }

		// If no coordinates found, find from geometry (nearest to map center)
		if(!coordinates) {
			const coords = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
			let prevDist = null;
			const mapBbox = this.getBounds();
			const mapCenter = mapBbox.getCenter();
			for(let i=0; i < coords.length; i++) {
				for(let j=0; j < coords[i].length; j++) {
					if(mapBbox.contains(coords[i][j])) {
						let dist = mapCenter.distanceTo(new maplibregl.LngLat(...coords[i][j]));
						if(prevDist === null || dist < prevDist) {
							coordinates = coords[i][j];
							prevDist = dist;
						}
					}
				}
			}

			if(!coordinates) { return; }
		}

		// Display thumbnail
		this._picPopup
			.setLngLat(coordinates)
			.addTo(this);
		
		// Only show GIF loader if thumbnail is not in browser cache
		if(!this._picThumbUrl[f.properties.id]) {
			this._picPopup.setDOMContent(getThumbGif(this._parent._t));
		}

		this._picPopup._loading = f.properties.id;
		this._picPopup._picId = f.properties.id;

		const displayThumb = thumbUrl => {
			if(this._picPopup._loading === f.properties.id) {
				delete this._picPopup._loading;

				if(thumbUrl) {
					let content = document.createElement("img");
					content.classList.add("gvs-map-thumb");
					content.alt = this._parent._t.map.thumbnail;
					let img = new Image();
					img.src = thumbUrl;

					img.addEventListener("load", () => {
						if(f.properties.hidden) {
							content.children[0].src = img.src;
						}
						else {
							content.src = img.src;
						}
						this._picPopup.setDOMContent(content);
					});

					if(f.properties.hidden) {
						const legend = document.createElement("div");
						legend.classList.add("gvs-map-thumb-legend");
						legend.appendChild(document.createTextNode(this._parent._t.map.not_public));
						const container = document.createElement("div");
						container.appendChild(content);
						container.appendChild(legend);
						content = container;
					}
				}
				else {
					this._picPopup.remove();
					//this._picPopup.setHTML(`<i>${this._parent._t.map.no_thumbnail}</i>`);
				}
			}
		};

		// Click on a single picture
		if(from.endsWith("pictures")) {
			this._getPictureThumbURL(f.properties.id).then(displayThumb);
		}
		// Click on a grid cell
		else if(from.endsWith("grid")) {
			this._getThumbURL(coordinates).then(displayThumb);
		}
		// Click on a sequence
		else {
			this._getSequenceThumbURL(f.properties.id, new maplibregl.LngLat(...coordinates)).then(displayThumb);
		}
	}

	/**
	 * Get picture thumbnail URL at given coordinates
	 *
	 * @param {LngLat} coordinates The map coordinates
	 * @returns {Promise} Promise resolving on picture thumbnail URL, or null on timeout
	 * @private
	 */
	_getThumbURL(coordinates) {
		return this._parent._api.getPicturesAroundCoordinates(coordinates[1], coordinates[0], 0.1, 1).then(res => {
			const p = res?.features?.pop();
			return p ? this._parent._api.findThumbnailInPictureFeature(p) : null;
		});
	}
	

	/**
	 * Get picture thumbnail URL for a given sequence ID
	 *
	 * @param {string} seqId The sequence ID
	 * @param {LngLat} [coordinates] The map coordinates
	 * @returns {Promise} Promise resolving on picture thumbnail URL, or null on timeout
	 * @private
	 */
	_getSequenceThumbURL(seqId, coordinates) {
		if(coordinates) {
			return this._parent._api.getPicturesAroundCoordinates(coordinates.lat, coordinates.lng, 1, 1, seqId)
				.then(results => {
					if(results?.features?.length > 0) {
						return this._parent._api.findThumbnailInPictureFeature(results.features[0]);
					}
					else {
						return this._parent._api.getPictureThumbnailURLForSequence(seqId);
					}
				});
		}
		else {
			return this._parent._api.getPictureThumbnailURLForSequence(seqId);
		}
	}

	/**
	 * Get picture thumbnail URL for a given picture ID.
	 * It handles a client-side cache based on raw API responses.
	 *
	 * @param {string} picId The picture ID
	 * @param {string} [seqId] The sequence ID (can speed up search if available)
	 * @returns {Promise} Promise resolving on picture thumbnail URL, or null on timeout
	 * 
	 * @private
	 */
	_getPictureThumbURL(picId, seqId) {
		let res = null;

		if(picId) {
			if(this._picThumbUrl[picId] !== undefined) {
				res = typeof this._picThumbUrl[picId] === "string" ? Promise.resolve(this._picThumbUrl[picId]) : this._picThumbUrl[picId];
			}
			else {
				this._picThumbUrl[picId] = this._parent._api.getPictureThumbnailURL(picId, seqId).then(url => {
					if(url) {
						this._picThumbUrl[picId] = url;
						return url;
					}
					else {
						this._picThumbUrl[picId] = null;
						return null;
					}
				})
					.catch(() => {
						this._picThumbUrl[picId] = null;
					});
				res = this._picThumbUrl[picId];
			}
		}

		return res;
	}

	/**
	 * Create a ready-to-use picture marker
	 *
	 * @returns {maplibregl.Marker} The generated marker
	 * @private
	 */
	_getPictureMarker(selected = true) {
		const img = document.createElement("img");
		img.src = selected ? MarkerSelectedSVG : MarkerBaseSVG;
		img.alt = "";
		return new maplibregl.Marker({
			element: img
		});
	}

	/**
	 * Event handler for sequence hover
	 * @private
	 * @param {object} e Event data
	 */
	_onSequenceHover(e) {
		e.preventDefault();
		if(e.features.length > 0 && e.features[0].properties?.id) {
			/**
			 * Event when a sequence on map is hovered (not selected)
			 *
			 * @event map:sequence-hover
			 * @memberof CoreView
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} detail.seqId The hovered sequence ID
			 */
			this._parent.dispatchEvent(new CustomEvent("map:sequence-hover", {
				detail: {
					seqId: e.features[0].properties.id
				}
			}));
		}
	}

	/**
	 * Event handler for sequence click
	 * @private
	 * @param {object} e Event data
	 */
	_onSequenceClick(e) {
		e.preventDefault();
		if(e.features.length > 0 && e.features[0].properties?.id) {
			/**
			 * Event when a sequence on map is clicked
			 *
			 * @event map:sequence-click
			 * @memberof CoreView
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} detail.seqId The clicked sequence ID
			 * @property {maplibregl.LngLat} detail.coordinates The coordinates of user click
			 */
			this._parent.dispatchEvent(new CustomEvent("map:sequence-click", {
				detail: {
					seqId: e.features[0].properties.id,
					coordinates: e.lngLat
				}
			}));
		}
	}

	/**
	 * Event handler for picture click
	 * @private
	 * @param {object} e Event data
	 */
	_onPictureClick(e) {
		e.preventDefault();
		const f = e?.features?.length > 0 ? e.features[0] : null;
		if(f?.properties?.id) {
			// Look for a potential sequence ID
			let seqId = null;
			try {
				if(f.properties.sequences) {
					if(!Array.isArray(f.properties.sequences)) { f.properties.sequences = JSON.parse(f.properties.sequences); }
					seqId = f.properties.sequences.pop();
				}
			}
			catch(e) {
				console.log("Sequence ID is not available in vector tiles for picture "+f.properties.id);
			}

			/**
			 * Event when a picture on map is clicked
			 *
			 * @event map:picture-click
			 * @memberof CoreView
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} detail.picId The clicked picture ID
			 * @property {string} detail.seqId The clicked picture's sequence ID
			 * @property {object} detail.feature The GeoJSON feature of the picture
			 */
			this._parent.dispatchEvent(new CustomEvent("map:picture-click", {
				detail: {
					picId: f.properties.id,
					seqId,
					feature: f
				}
			}));
		}
	}
}
