import "./Viewer.css";
import { SYSTEM as PSSystem, DEFAULTS as PSDefaults } from "@photo-sphere-viewer/core";
import Widgets from "./viewer/Widgets";
import URLHash from "./viewer/URLHash";
import { COLORS, QUALITYSCORE_VALUES, josmBboxParameters, linkMapAndPhoto } from "./utils/Utils";
import CoreView from "./components/CoreView";
import Photo, { PSV_DEFAULT_ZOOM, PSV_ANIM_DURATION, PIC_MAX_STAY_DURATION } from "./components/Photo";
import Map from "./components/Map";
import { TILES_PICTURES_ZOOM, MAP_EXPR_QUALITYSCORE } from "./utils/Map";
import { enableCopyButton, fa } from "./utils/Widgets";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";


const PSV_ZOOM_DELTA = 20;
const PSV_MOVE_DELTA = Math.PI / 6;
const MAP_MOVE_DELTA = 100;
const JOSM_REMOTE_URL = "http://127.0.0.1:8111";

const MAP_THEMES = {
	DEFAULT: "default",
	AGE: "age",
	TYPE: "type",
	SCORE: "score",
};


/**
 * Viewer is the main component of Panoramax JS library, showing pictures and map.
 * 
 * Note that you can use any of the [CoreView](#CoreView) class functions as well.
 *
 * @param {string|Element} container The DOM element to create viewer into
 * @param {string} endpoint URL to API to use (must be a [STAC API](https://github.com/radiantearth/stac-api-spec/blob/main/overview.md))
 * @param {object} [options] Viewer options
 * @param {string} [options.selectedPicture] Initial picture identifier to display
 * @param {number[]} [options.position] Initial position to go to (in [lat, lon] format)
 * @param {boolean} [options.hash=true] Enable URL hash settings
 * @param {string} [options.lang] Override language to use (defaults to navigator language, or English if translation not available)
 * @param {int} [options.transition=250] Duration of stay on a picture during sequence play (excludes loading time)
 * @param {object} [options.fetchOptions=null] Set custom options for fetch calls made against API ([same syntax as fetch options parameter](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters))
 * @param {string|string[]} [options.users] The IDs of users whom data should appear on map (defaults to all). Only works with API having a "user-xyz" or "user-xyz-style" endpoint.
 * @param {string} [options.picturesNavigation] The allowed navigation between pictures ("any": no restriction (default), "seq": only pictures in same sequence, "pic": only selected picture)
 * @param {boolean|object} [options.map=false] Enable contextual map for locating pictures. Setting to true or passing an object enables the map. Various settings can be passed, either the ones defined here, or any of [MapLibre GL settings](https://maplibre.org/maplibre-gl-js-docs/api/map/#map-parameters)
 * @param {boolean} [options.map.startWide] Show the map as main element at startup (defaults to false, viewer is wider at start)
 * @param {number} [options.map.minZoom=0] The minimum zoom level of the map (0-24).
 * @param {number} [options.map.maxZoom=24] The maximum zoom level of the map (0-24).
 * @param {string|object} [options.style] The map's MapLibre style. This can be an a JSON object conforming to the schema described in the [MapLibre Style Specification](https://maplibre.org/maplibre-gl-js-docs/style-spec/), or a URL string pointing to one.
 * @param {object} [options.map.raster] The MapLibre raster source for aerial background. This must be a JSON object following [MapLibre raster source definition](https://maplibre.org/maplibre-style-spec/sources/#raster).
 * @param {external:maplibre-gl.LngLatLike} [options.map.center=[0, 0]] The initial geographical centerpoint of the map. If `center` is not specified in the constructor options, MapLibre GL JS will look for it in the map's style object. If it is not specified in the style, either, it will default to `[0, 0]` Note: MapLibre GL uses longitude, latitude coordinate order (as opposed to latitude, longitude) to match GeoJSON.
 * @param {number} [options.map.zoom=0] The initial zoom level of the map. If `zoom` is not specified in the constructor options, MapLibre GL JS will look for it in the map's style object. If it is not specified in the style, either, it will default to `0`.
 * @param {external:maplibre-gl.LngLatBoundsLike} [options.map.bounds] The initial bounds of the map. If `bounds` is specified, it overrides `center` and `zoom` constructor options.
 * @param {object} [options.map.geocoder] Optional geocoder settings
 * @param {string} [options.map.geocoder.engine] Set the geocoder engine to use (nominatim, ban)
 * @param {string} [options.map.background] Choose default map background to display (streets or aerial, if raster aerial background available). Defaults to street.
 * @param {string} [options.map.theme=default] The colouring scheme to use for pictures and sequences on map (default, age, type)
 * @param {object} [options.widgets] Settings related to viewer buttons and widgets
 * @param {string} [options.widgets.editIdUrl] URL to the OpenStreetMap iD editor (defaults to OSM.org iD instance)
 * @param {string|Element} [options.widgets.customWidget] A user-defined widget to add (will be shown over "Share" button)
 * @param {string} [options.widgets.mapAttribution] Override the default map attribution (read from MapLibre style)
 * @param {string} [options.widgets.iframeBaseURL] Set a custom base URL for the "Share as iframe" menu (defaults to current page)
 * 
 * @property {Map} map The map widget
 * @property {Photo} psv The photo widget
 */
class Viewer extends CoreView {
	constructor(container, endpoint, options = {}){
		super(container, endpoint, options);

		if(this._options.map == null) { this._options.map = {}; }
		if(this._options.widgets == null) { this._options.widgets = {}; }

		// Set variables
		this._sequencePlaying = false;
		this._prevSequence = null;
		this._mapTheme = options?.map?.theme || MAP_THEMES.DEFAULT;
		this._picNav = options?.picturesNavigation || "any";

		// Skip all init phases for more in-depth testing
		if(this._options.testing) { return; }

		// Read initial options from URL hash
		let hashOpts;
		if(this._options.hash === true || this._options.hash === undefined) {
			this._hash = new URLHash(this);
			hashOpts = this._hash._getCurrentHash();

			if(hashOpts.map === "none") {
				this._options.map = false;
			}

			if(typeof this._options.map === "object") { this._options.map.hash = false; }

			// Restore focus
			if(this._options.map && hashOpts.focus) {
				this._options.map.startWide = hashOpts.focus === "map";
			}

			// Restore map background
			if(this._options.map && hashOpts.background) {
				this._options.map.background = hashOpts.background;
			}

			// Restore visible users
			if(this._options.map && hashOpts.users) {
				this._options.users = [...new Set(hashOpts.users.split(","))];
			}

			// Restore viewer position
			if(hashOpts.xyz) {
				const coords = this._hash.getXyzOptionsFromHashString(hashOpts.xyz);
				this.addEventListener("psv:picture-loaded", () => {
					this.psv.setXYZ(coords.x, coords.y, coords.z);
				}, { once: true });
			}

			// Restore map zoom/center
			if(this._options.map && typeof hashOpts.map === "string") {
				const mapOpts = this._hash.getMapOptionsFromHashString(hashOpts.map);
				if(mapOpts) {
					this._options.map = Object.assign({}, this._options.map, mapOpts);
				}
			}

			// Restore map filters
			if(this._options.map) {
				this.setFilters(this._hash.getMapFiltersFromHashVals(hashOpts), true);
			}

			// Restore picture from URL hash
			if(hashOpts.pic) {
				const picIds = hashOpts.pic.split(";"); // Handle multiple IDs coming from OSM
				if(picIds.length > 1) {
					console.warn("Multiple picture IDs passed in URL, only first one kept");
				}
				this._options.selectedPicture = picIds[0];
			}

			// Restore play speed
			if(typeof hashOpts.speed === "string") {
				this._options.transition = parseInt(hashOpts.speed);
			}

			// Restore pictures navigation
			if(hashOpts.nav) {
				this._picNav = hashOpts.nav;
			}
		}

		// Init all DOM and components
		this._initContainerStructure();
		try {
			this.psv = new Photo(this, this.psvContainer, {
				transitionDuration: this._options.transition,
				shouldGoFast: this._psvShouldGoFast.bind(this),
				keyboard: "always",
				keyboardActions: {
					...PSDefaults.keyboardActions,
					"8": "ROTATE_UP",
					"2": "ROTATE_DOWN",
					"4": "ROTATE_LEFT",
					"6": "ROTATE_RIGHT",

					"PageUp": () => this.psv.goToNextPicture(),
					"9": () => this.psv.goToNextPicture(),

					"PageDown": () => this.psv.goToPrevPicture(),
					"3": () => this.psv.goToPrevPicture(),

					"5": () => this.moveCenter(),
					"*": () => this.moveCenter(),

					"Home": () => this.toggleFocus(),
					"7": () => this.toggleFocus(),

					"End": () => this.toggleUnfocusedVisible(),
					"1": () => this.toggleUnfocusedVisible(),

					" ": () => this.toggleSequencePlaying(),
					"0": () => this.toggleSequencePlaying(),
				},
			});
			this.psv.addEventListener("dblclick", () => {
				if(this.map && this.isMapWide()) { this.setFocus("pic"); }
			});
		}
		catch(e) {
			let err = !PSSystem.isWebGLSupported ? this._t.gvs.error_webgl : this._t.gvs.error_psv;
			this._loader.dismiss(e, err);
		}

		// Call appropriate functions at start according to initial options
		const onceStuffReady = () => {
			this._widgets = new Widgets(this, this._options.widgets);
			
			// Hide mini component if no selected picture
			if(this.map && !this._options.selectedPicture) {
				this.setUnfocusedVisible(false);
			}

			if(this._options.selectedPicture) {
				this.select(null, this._options.selectedPicture, true);
				this.addEventListener("psv:picture-loaded", () => {
					// Force setting of sequence ID after load
					if(!this._selectedSeqId && this.psv?._myVTour?.getCurrentNode()?.sequence?.id) {
						this.select(this.psv._myVTour.getCurrentNode().sequence.id, this._options.selectedPicture);
					}
					if(this.map && this._options.map) {
						this.map.jumpTo(this._options.map);
					}
					if(hashOpts?.focus === "meta") {
						this._widgets._showPictureMetadataPopup();
					}
					this._loader.dismiss();
				}, { once: true });
			}
			else {
				this._loader.dismiss();
			}

			if(this._options.position) {
				this.goToPosition(...this._options.position).catch(e => this._loader.dismiss(e, this._t.gvs.error_nopic));
			}

			if(this._hash && this.map) {
				this.map._attribution._container.classList.add("gvs-hidden");
				this._hash.bindMapEvents();
				if(this._mapFilters) {
					this.setFilters(this._mapFilters, true);
				}

				// Restore user ID in filters
				if(hashOpts.users) {
					Promise.all(
						this.map.getVisibleUsers()
							.filter(uid => uid != "geovisio")
							.map(uid => this._api.getUserName(uid))
					).then(userNames => {
						userNames = userNames.filter(un => un != null).join(", ");
						const userSearchField = document.getElementById("gvs-filter-search-user").querySelector("input");
						if(userSearchField) {
							userSearchField.setItem(userNames);
							userSearchField.parentNode.classList.add("gvs-filter-active");
						}
					}).catch(e => console.warn("Error when looking up for user names", e));
				}
			}

			// Dismiss popup with Escape
			document.addEventListener("keyup", e => {
				if(e.key === "Escape" && !this.popupContainer.classList.contains("gvs-hidden")) {
					this.setPopup(false);
				}
			});
		};

		this._api.onceReady().then(() => {
			if(this._options.map) {
				if(this._options.map.doubleClickZoom === undefined) {
					this._options.map.doubleClickZoom = false;
				}
				
				this._initMap()
					.then(onceStuffReady)
					.catch(e => this._loader.dismiss(e, this._t.gvs.error_api_compatibility));
			}
			else {
				onceStuffReady();
			}
		});
	}

	getClassName() {
		return "Viewer";
	}

	/**
	 * Ends all form of life in this object.
	 * 
	 * This is useful for Single Page Applications (SPA), to remove various event listeners.
	 */
	destroy() {
		super.destroy();

		// Delete sub-components
		this._widgets.destroy();
		delete this._widgets;
		this._hash.destroy();
		delete this._hash;
		if (this.map) {
			this.map.destroy();
		}
		delete this.map;
		delete this._mapFilters;
		this.psv.destroy();
		delete this.psv;

		// Clean-up DOM
		this.miniContainer.remove();
		this.mainContainer.remove();
		this.mapContainer.remove();
		this.psvContainer.remove();
		this.popupContainer.remove();
		this.container.innerHTML = "";
		this.container.classList.remove(...[...this.container.classList].filter(c => c.startsWith("gvs")));
	}

	/**
	 * Creates appropriate HTML elements in container to host map + viewer
	 *
	 * @private
	 */
	_initContainerStructure() {
		// Create mini-component container
		this.miniContainer = document.createElement("div");
		this.miniContainer.classList.add("gvs-mini");

		// Create main-component container
		this.mainContainer = document.createElement("div");
		this.mainContainer.classList.add("gvs-main");

		// Crate a popup container
		this.popupContainer = document.createElement("div");
		this.popupContainer.classList.add("gvs-popup", "gvs-hidden");

		// Create PSV container
		this.psvContainer = document.createElement("div");
		this.mainContainer.appendChild(this.psvContainer);

		// Create map container
		this.mapContainer = document.createElement("div");
		this.miniContainer.appendChild(this.mapContainer);

		// Add in root container
		this.container.appendChild(this.mainContainer);
		this.container.appendChild(this.miniContainer);
		this.container.appendChild(this.popupContainer);
	}

	/**
	 * Inits MapLibre GL component
	 *
	 * @private
	 * @returns {Promise} Resolves when map is ready
	 */
	async _initMap() {
		await new Promise(resolve => {
			this.map = new Map(this, this.mapContainer, this._options.map);
			this.map._getLayerColorStyle = this._getLayerColorStyle.bind(this);
			this.map._getLayerSortStyle = this._getLayerSortStyle.bind(this);
			this.addEventListener("map:users-changed", resolve, { once: true });
			this.container.classList.add("gvs-has-mini");

			// Map double-click: unselect if focused, toggle focus if unfocused
			this.map.on("dblclick", () => {
				if(!this.isMapWide()) { this.setFocus("map"); }
				else { this.select(); }
			});

			if (typeof this._options.map === "object" && this._options.map.startWide) {
				this.setFocus("map", true);
			}
			else {
				this.setFocus("pic", true);
			}
		});

		this._initMapKeyboardHandler();
		linkMapAndPhoto(this);
	}

	/**
	 * Adds events related to keyboard
	 * @private
	 */
	_initMapKeyboardHandler() {
		const that = this;
		this.map.keyboard.keydown = function(e) {
			if (e.altKey || e.ctrlKey || e.metaKey) return;
	
			// Custom keys
			switch(e.key) {
			case "*":
			case "5":
				that.moveCenter();
				return;

			case "PageUp":
			case "9":
				that.psv.goToNextPicture();
				return;
			
			case "PageDown":
			case "3":
				that.psv.goToPrevPicture();
				return;
			
			case "Home":
			case "7":
				e.stopPropagation();
				that.toggleFocus();
				return;
			
			case "End":
			case "1":
				that.toggleUnfocusedVisible();
				return;
			
			case " ":
			case "0":
				that.toggleSequencePlaying();
				return;
			}

			let zoomDir = 0;
			let bearingDir = 0;
			let pitchDir = 0;
			let xDir = 0;
			let yDir = 0;
	
			switch (e.keyCode) {
			case 61:
			case 107:
			case 171:
			case 187:
				zoomDir = 1;
				break;

			case 189:
			case 109:
			case 173:
				zoomDir = -1;
				break;

			case 37:
			case 100:
				if (e.shiftKey) {
					bearingDir = -1;
				} else {
					e.preventDefault();
					xDir = -1;
				}
				break;

			case 39:
			case 102:
				if (e.shiftKey) {
					bearingDir = 1;
				} else {
					e.preventDefault();
					xDir = 1;
				}
				break;

			case 38:
			case 104:
				if (e.shiftKey) {
					pitchDir = 1;
				} else {
					e.preventDefault();
					yDir = -1;
				}
				break;

			case 40:
			case 98:
				if (e.shiftKey) {
					pitchDir = -1;
				} else {
					e.preventDefault();
					yDir = 1;
				}
				break;

			default:
				return;
			}
	
			if (this._rotationDisabled) {
				bearingDir = 0;
				pitchDir = 0;
			}
	
			return {
				cameraAnimation: (map) => {
					const tr = this._tr;
					map.easeTo({
						duration: 300,
						easeId: "keyboardHandler",
						easing: t => t * (2-t),
						zoom: zoomDir ? Math.round(tr.zoom) + zoomDir * (e.shiftKey ? 2 : 1) : tr.zoom,
						bearing: tr.bearing + bearingDir * this._bearingStep,
						pitch: tr.pitch + pitchDir * this._pitchStep,
						offset: [-xDir * this._panStep, -yDir * this._panStep],
						center: tr.center
					}, {originalEvent: e});
				}
			};
		}.bind(this.map.keyboard);
	}

	/**
	 * Given context, should tiles be loaded in PSV.
	 * @private
	 */
	_psvShouldGoFast() {
		return (this._sequencePlaying && this.psv.getTransitionDuration() < 1000)
			|| (this.map && this.isMapWide());
	}

	/**
	 * Force reload of texture and tiles in Photo Sphere Viewer.
	 */
	refreshPSV() {
		const cn = this.psv._myVTour.getCurrentNode();

		// Refresh mode for flat pictures
		if(cn && cn.panorama.baseUrl !== cn?.panorama?.origBaseUrl) {
			const prevZoom = this.psv.getZoomLevel();
			const prevPos = this.psv.getPosition();
			this.psv._myVTour.state.currentNode = null;
			this.psv._myVTour.setCurrentNode(cn.id, {
				zoomTo: prevZoom,
				rotateTo: prevPos,
				fadeIn: false,
				speed: 0,
				rotation: false,
			});
		}

		// Refresh mode for 360 pictures
		if(cn && cn.panorama.rows > 1) {
			this.psv.adapter.__refresh();
		}
	}

	/**
	 * Change full-page popup visibility and content
	 * @param {boolean} visible True to make it appear
	 * @param {string|Element[]} [content] The new popup content
	 */
	setPopup(visible, content = null) {
		if(!visible) {
			this.popupContainer.classList.add("gvs-hidden");
			this.psv.startKeyboardControl();
		}
		else if(content) {
			this.psv.stopKeyboardControl();
			this.popupContainer.innerHTML = "";
			const backdrop = document.createElement("div");
			backdrop.classList.add("gvs-popup-backdrop");
			backdrop.addEventListener("click", () => this.setPopup(false));
			const innerDiv = document.createElement("div");
			innerDiv.classList.add("gvs-widget-bg");

			if(typeof content === "string") { innerDiv.innerHTML = content; }
			else if(Array.isArray(content)) { content.forEach(c => innerDiv.appendChild(c)); }

			// Add close button
			const btnClose = document.createElement("button");
			btnClose.id = "gvs-popup-btn-close";
			btnClose.classList.add("gvs-btn", "gvs-widget-bg");
			btnClose.appendChild(fa(faXmark));
			btnClose.addEventListener("click", () => this.setPopup(false));
			innerDiv.insertBefore(btnClose, innerDiv.firstChild);

			this.popupContainer.appendChild(backdrop);
			this.popupContainer.appendChild(innerDiv);
			this.popupContainer.classList.remove("gvs-hidden");
			enableCopyButton(this.popupContainer, this._t);
		}
		else {
			this.popupContainer.classList.remove("gvs-hidden");
		}
	}

	/**
	 * Goes continuously to next picture in sequence as long as possible
	 */
	playSequence() {
		this._sequencePlaying = true;

		/**
		 * Event for sequence starting to play
		 *
		 * @event sequence-playing
		 * @memberof Viewer
		 */
		const event = new Event("sequence-playing");
		this.dispatchEvent(event);

		const nextPicturePlay = () => {
			if(this._sequencePlaying) {
				this.addEventListener("psv:picture-loaded", () => {
					this._playTimer = setTimeout(() => {
						nextPicturePlay();
					}, this.psv.getTransitionDuration());
				}, { once: true });

				try {
					this.psv.goToNextPicture();
				}
				catch(e) {
					this.stopSequence();
				}
			}
		};

		// Stop playing if user clicks on image
		this.psv.addEventListener("click", () => {
			this.stopSequence();
		});

		nextPicturePlay();
	}

	/**
	 * Stops playing current sequence
	 */
	stopSequence() {
		this._sequencePlaying = false;

		// Next picture timer is pending
		if(this._playTimer) {
			clearTimeout(this._playTimer);
			delete this._playTimer;
		}

		// Force refresh of PSV to eventually load tiles
		this.refreshPSV();

		/**
		 * Event for sequence stopped playing
		 *
		 * @event sequence-stopped
		 * @memberof Viewer
		 */
		const event = new Event("sequence-stopped");
		this.dispatchEvent(event);
	}

	/**
	 * Is there any sequence being played right now ?
	 *
	 * @returns {boolean} True if sequence is playing
	 */
	isSequencePlaying() {
		return this._sequencePlaying;
	}

	/**
	 * Starts/stops the reading of pictures in a sequence
	 */
	toggleSequencePlaying() {
		if(this.isSequencePlaying()) {
			this.stopSequence();
		}
		else {
			this.playSequence();
		}
	}

	/**
	 * Move the view of main component to its center.
	 * For map, center view on selected picture.
	 * For picture, center view on image center.
	 */
	moveCenter() {
		const meta = this.psv.getPictureMetadata();
		if(!meta) { return; }

		if(this.map && this.isMapWide()) {
			this.map.flyTo({ center: meta.gps, zoom: 20 });
		}
		else {
			this._psvAnimate({
				speed: PSV_ANIM_DURATION,
				yaw: 0,
				pitch: 0,
				zoom: PSV_DEFAULT_ZOOM
			});
		}
	}

	/**
	 * Moves the view of main component slightly to the left.
	 */
	moveLeft() {
		this._moveToDirection("left");
	}

	/**
	 * Moves the view of main component slightly to the right.
	 */
	moveRight() {
		this._moveToDirection("right");
	}

	/**
	 * Moves the view of main component slightly to the top.
	 */
	moveUp() {
		this._moveToDirection("up");
	}

	/**
	 * Moves the view of main component slightly to the bottom.
	 */
	moveDown() {
		this._moveToDirection("down");
	}

	/**
	 * Moves map or picture viewer to given direction.
	 * @param {string} dir Direction to move to (up, left, down, right)
	 * @private
	 */
	_moveToDirection(dir) {
		if(this.map && this.isMapWide()) {
			let pan;
			switch(dir) {
			case "up":
				pan = [0, -MAP_MOVE_DELTA];
				break;
			case "left":
				pan = [-MAP_MOVE_DELTA, 0];
				break;
			case "down":
				pan = [0, MAP_MOVE_DELTA];
				break;
			case "right":
				pan = [MAP_MOVE_DELTA, 0];
				break;
			}
			this.map.panBy(pan);
		}
		else {
			let pos = this.psv.getPosition();
			switch(dir) {
			case "up":
				pos.pitch += PSV_MOVE_DELTA;
				break;
			case "left":
				pos.yaw -= PSV_MOVE_DELTA;
				break;
			case "down":
				pos.pitch -= PSV_MOVE_DELTA;
				break;
			case "right":
				pos.yaw += PSV_MOVE_DELTA;
				break;
			}
			this._psvAnimate({ speed: PSV_ANIM_DURATION, ...pos });
		}
	}

	/**
	 * Overrided PSV animate function to ensure a single animation plays at once.
	 * @param {object} options PSV animate options
	 * @private
	 */
	_psvAnimate(options) {
		if(this._lastPsvAnim) { this._lastPsvAnim.cancel(); }
		this._lastPsvAnim = this.psv.animate(options);
	}

	/**
	 * Is the map shown as main element instead of viewer (wide map mode) ?
	 *
	 * @returns {boolean} True if map is wider than viewer
	 */
	isMapWide() {
		if(!this.map) { throw new Error("Map is not enabled"); }
		return this.mapContainer.parentNode == this.mainContainer;
	}

	/**
	 * Computes dates to use for map theme by picture/sequence age
	 * @private
	 */
	_getDatesForLayerColors() {
		const oneDay = 24 * 60 * 60 * 1000;
		const d0 = Date.now();
		const d1 = d0 - 30 * oneDay;
		const d2 = d0 - 365 * oneDay;
		const d3 = d0 - 2 * 365 * oneDay;
		return [d1, d2, d3].map(d => new Date(d).toISOString().split("T")[0]);
	}

	/**
	 * Retrieve map layer color scheme according to selected theme.
	 * @private
	 */
	_getLayerColorStyle(layer) {
		// Hidden style
		const s = ["case",
			["==", ["get", "hidden"], true], COLORS.HIDDEN
		];

		// Selected sequence style
		const picId = this.psv._myVTour?.state?.loadingNode || this.psv._myVTour?.state?.currentNode?.id;
		const seqId = picId ? this.psv._picturesSequences[picId] : null;
		if(layer == "sequences" && seqId) {
			s.push(["==", ["get", "id"], seqId], COLORS.SELECTED);
		}
		else if(layer == "pictures" && seqId) {
			s.push(["in", seqId, ["get", "sequences"]], COLORS.SELECTED);
		}
		
		// Themes styles
		if(this._mapTheme == MAP_THEMES.AGE) {
			const prop = layer == "sequences" ? "date" : "ts";
			const dt = this._getDatesForLayerColors();

			s.push(
				["!", ["has", prop]], COLORS.BASE,
				[">=", ["get", prop], dt[0]], COLORS.PALETTE_4,
				[">=", ["get", prop], dt[1]], COLORS.PALETTE_3,
				[">=", ["get", prop], dt[2]], COLORS.PALETTE_2,
				COLORS.PALETTE_1
			);
		}
		else if(this._mapTheme == MAP_THEMES.TYPE) {
			s.push(
				["!", ["has", "type"]], COLORS.BASE,
				["==", ["get", "type"], "equirectangular"], COLORS.QUALI_1,
				COLORS.QUALI_2
			);
		}
		else if(this._mapTheme == MAP_THEMES.SCORE) {
			s.push(
				["==", MAP_EXPR_QUALITYSCORE, 5], QUALITYSCORE_VALUES[0].color,
				["==", MAP_EXPR_QUALITYSCORE, 4], QUALITYSCORE_VALUES[1].color,
				["==", MAP_EXPR_QUALITYSCORE, 3], QUALITYSCORE_VALUES[2].color,
				["==", MAP_EXPR_QUALITYSCORE, 2], QUALITYSCORE_VALUES[3].color,
				QUALITYSCORE_VALUES[4].color,
			);
		}
		else {
			s.push(COLORS.BASE);
		}

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
		const picId = this.psv._myVTour?.state?.loadingNode || this.psv._myVTour?.state?.currentNode?.id;
		const seqId = picId ? this.psv._picturesSequences[picId] : null;
		if(layer == "sequences" && seqId) {
			s.push(["==", ["get", "id"], seqId], 100);
		}
		else if(layer == "pictures" && seqId) {
			s.push(["in", seqId, ["get", "sequences"]], 100);
		}

		// Themes styles
		if(this._mapTheme == MAP_THEMES.AGE) {
			const prop = layer == "sequences" ? "date" : "ts";
			const dt = this._getDatesForLayerColors();
			s.push(
				["!", ["has", prop]], 0,
				[">=", ["get", prop], dt[0]], 50,
				[">=", ["get", prop], dt[1]], 49,
				[">=", ["get", prop], dt[2]], 48,
			);
		}
		else if(this._mapTheme == MAP_THEMES.TYPE) {
			s.push(
				["!", ["has", "type"]], 0,
				["==", ["get", "type"], "equirectangular"], 50,
			);
		}
		else if(this._mapTheme == MAP_THEMES.SCORE) {
			s.push(
				["==", MAP_EXPR_QUALITYSCORE, 5], 80,
				["==", MAP_EXPR_QUALITYSCORE, 4], 65,
				["==", MAP_EXPR_QUALITYSCORE, 3], 50,
				["==", MAP_EXPR_QUALITYSCORE, 2], 35,
				["==", MAP_EXPR_QUALITYSCORE, 1], 20,
			);
		}

		s.push(10);
		return s;
	}

	/**
	 * Get current pictures navigation mode.
	 * @returns {string} The picture navigation mode ("any": no restriction, "seq": only pictures in same sequence, "pic": only selected picture)
	 */
	getPicturesNavigation() {
		return this._picNav;
	}

	/**
	 * Switch the allowed navigation between pictures.
	 * @param {string} pn The picture navigation mode ("any": no restriction, "seq": only pictures in same sequence, "pic": only selected picture)
	 */
	setPicturesNavigation(pn) {
		this._picNav = pn;

		/**
		 * Event for pictures navigation mode change
		 *
		 * @event pictures-navigation-changed
		 * @memberof Viewer
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} detail.value New mode (any, pic, seq)
		 */
		const event = new CustomEvent("pictures-navigation-changed", { detail: { value: pn } });
		this.dispatchEvent(event);
	}

	/**
	 * Filter function
	 * @param {object} link A STAC next/prev/related link definition
	 * @returns {boolean} True if link should be kept
	 * @private
	 */
	_picturesNavFilter(link) {
		switch(this._picNav) {
		case "seq":
			return ["next", "prev"].includes(link.rel);
		case "pic":
			return false;
		case "any":
		default:
			return true;
		}
	}

	/**
	 * Enable or disable JOSM live editing using [Remote](https://josm.openstreetmap.de/wiki/Help/RemoteControlCommands)
	 * @param {boolean} enabled Set to true to enable JOSM live
	 * @returns {Promise} Resolves on JOSM live being enabled or disabled
	 */
	toggleJOSMLive(enabled) {
		if(enabled) {
			/**
			 * Event for JOSM live enabled
			 *
			 * @event josm-live-enabled
			 * @memberof Viewer
			 */
			const event = new CustomEvent("josm-live-enabled");
			this.dispatchEvent(event);

			// Check if JOSM remote is enabled
			return fetch(JOSM_REMOTE_URL+"/version")
				.catch(e => {
					this.dispatchEvent(new CustomEvent("josm-live-disabled"));
					throw e;
				})
				.then(() => {
					// First loading : download + zoom
					const p1 = josmBboxParameters(this.psv.getPictureMetadata());
					if(p1) {
						const url = `${JOSM_REMOTE_URL}/load_and_zoom?${p1}`;
						fetch(url).catch(e => {
							console.warn(e);
							this.toggleJOSMLive(false);
						});
					}

					// Enable event listening
					this._josmListener = () => {
						const p2 = josmBboxParameters(this.psv.getPictureMetadata());
						if(p2) {
							// Next loadings : just zoom
							//   This avoids desktop focus to go on JOSM instead of
							//   staying on web browser
							const url = `${JOSM_REMOTE_URL}/zoom?${p2}`;
							fetch(url).catch(e => {
								console.warn(e);
								this.toggleJOSMLive(false);
							});
						}
					};
					this.addEventListener("psv:picture-loaded", this._josmListener);
					this.addEventListener("psv:picture-loading", this._josmListener);
				});
		}
		else {
			/**
			 * Event for JOSM live disabled
			 *
			 * @event josm-live-disabled
			 * @memberof Viewer
			 */
			const event = new CustomEvent("josm-live-disabled");
			this.dispatchEvent(event);

			if(this._josmListener) {
				this.removeEventListener("psv:picture-loading", this._josmListener);
				this.removeEventListener("psv:picture-loaded", this._josmListener);
				delete this._josmListener;
			}
			return Promise.resolve();
		}
	}

	/**
	 * Change the viewer focus (either on picture or map)
	 *
	 * @param {string} focus The object to focus on (map, pic)
	 * @param {boolean} [skipEvent=false] True to not send focus-changed event
	 */
	setFocus(focus, skipEvent = false) {
		if(focus === "map" && !this.map) { throw new Error("Map is not enabled"); }
		if(!["map", "pic"].includes(focus)) { throw new Error("Invalid focus value (should be pic or map)"); }
		if(
			(focus === "map" && this.map && this.isMapWide())
			|| (focus === "pic" && (!this.map || !this.isMapWide()))
		) { return; }

		this.mapContainer.parentElement?.removeChild(this.mapContainer);
		this.psvContainer.parentElement?.removeChild(this.psvContainer);

		if(focus === "map") {
			this.psv.stopKeyboardControl();
			this.map.keyboard.enable();
			this.container.classList.add("gvs-focus-map");
			this.mainContainer.appendChild(this.mapContainer);
			this.miniContainer.appendChild(this.psvContainer);
			this.map.getCanvas().focus();
		}
		else {
			this?.map?.keyboard.disable();
			this.psv.startKeyboardControl();
			this.container.classList.remove("gvs-focus-map");
			this.mainContainer.appendChild(this.psvContainer);
			this.miniContainer.appendChild(this.mapContainer);
			this.psvContainer.focus();
		}

		this?.map?.resize();
		this.psv.autoSize();
		this.refreshPSV();

		if(!skipEvent) {
			/**
			 * Event for focus change (either map or picture is shown wide)
			 *
			 * @event focus-changed
			 * @memberof Viewer
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} detail.focus Component now focused on (map, pic)
			 */
			const event = new CustomEvent("focus-changed", { detail: { focus } });
			this.dispatchEvent(event);
		}
	}

	/**
	 * Toggle the viewer focus (either on picture or map)
	 */
	toggleFocus() {
		if(!this.map) { throw new Error("Map is not enabled"); }
		this.setFocus(this.isMapWide() ? "pic" : "map");
	}

	/**
	 * Change the visibility of reduced component (picture or map)
	 *
	 * @param {boolean} visible True to make reduced component visible
	 */
	setUnfocusedVisible(visible) {
		if(!this.map) { throw new Error("Map is not enabled"); }

		if(visible) {
			this.container.classList.remove("gvs-mini-hidden");
		}
		else {
			this.container.classList.add("gvs-mini-hidden");
		}

		this.map.resize();
		this.psv.autoSize();
	}

	/**
	 * Toggle the visibility of reduced component (picture or map)
	 */
	toggleUnfocusedVisible() {
		if(!this.map) { throw new Error("Map is not enabled"); }
		this.setUnfocusedVisible(this.container.classList.contains("gvs-mini-hidden"));
	}

	/**
	 * Change the map filters
	 * @param {object} filters Filtering values
	 * @param {string} [filters.minDate] Start date for pictures (format YYYY-MM-DD)
	 * @param {string} [filters.maxDate] End date for pictures (format YYYY-MM-DD)
	 * @param {string} [filters.type] Type of picture to keep (flat, equirectangular)
	 * @param {string} [filters.camera] Camera make and model to keep
	 * @param {string} [filters.theme] Map theme to use
	 * @param {number[]} [filters.qualityscore] QualityScore values, as a list of 1 to 5 grades
	 * @param {boolean} [skipZoomIn=false] If true, doesn't force zoom in to map level >= 7
	 */
	setFilters(filters, skipZoomIn = false) {
		let mapSeqFilters = [];
		let mapPicFilters = [];
		let reloadMapStyle = false;
		this._mapFilters = {};

		if(filters.minDate && filters.minDate !== "") {
			this._mapFilters.minDate = filters.minDate;
			mapSeqFilters.push([">=", ["get", "date"], filters.minDate]);
			mapPicFilters.push([">=", ["get", "ts"], filters.minDate]);
		}

		if(filters.maxDate && filters.maxDate !== "") {
			this._mapFilters.maxDate = filters.maxDate;
			mapSeqFilters.push(["<=", ["get", "date"], filters.maxDate]);

			// Get tomorrow date for pictures filtering
			// (because ts is date+time, so comparing date only string would fail otherwise)
			let d = new Date(filters.maxDate);
			d.setDate(d.getDate() + 1);
			d = d.toISOString().split("T")[0];
			mapPicFilters.push(["<=", ["get", "ts"], d]);
		}

		if(filters.type && filters.type !== "") {
			this._mapFilters.type = filters.type;
			mapSeqFilters.push(["==", ["get", "type"], filters.type]);
			mapPicFilters.push(["==", ["get", "type"], filters.type]);
		}
		if(this.map?._hasGridStats()) {
			reloadMapStyle = true;
		}

		if(filters.camera && filters.camera !== "") {
			this._mapFilters.camera = filters.camera;
			// low/high model hack : to enable fuzzy filtering of camera make and model
			const lowModel = filters.camera.toLowerCase().trim() + "                    ";
			const highModel = filters.camera.toLowerCase().trim() + "zzzzzzzzzzzzzzzzzzzz";
			const collator = ["collator", { "case-sensitive": false, "diacritic-sensitive": false } ];
			mapSeqFilters.push([">=", ["get", "model"], lowModel, collator]);
			mapSeqFilters.push(["<=", ["get", "model"], highModel, collator]);
			mapPicFilters.push([">=", ["get", "model"], lowModel, collator]);
			mapPicFilters.push(["<=", ["get", "model"], highModel, collator]);
		}

		if(filters.qualityscore && filters.qualityscore.length > 0) {
			this._mapFilters.qualityscore = filters.qualityscore;
			mapSeqFilters.push(["in", MAP_EXPR_QUALITYSCORE, ["literal", this._mapFilters.qualityscore]]);
			mapPicFilters.push(["in", MAP_EXPR_QUALITYSCORE, ["literal", this._mapFilters.qualityscore]]);
		}

		if(filters.theme && Object.values(MAP_THEMES).includes(filters.theme)) {
			this._mapFilters.theme = filters.theme;
			if(this.map) {
				this._mapTheme = this._mapFilters.theme;
				reloadMapStyle = true;
			}
		}

		if(mapSeqFilters.length == 0) { mapSeqFilters = null; }
		else {
			mapSeqFilters.unshift("all");
		}

		if(mapPicFilters.length == 0) { mapPicFilters = null; }
		else {
			mapPicFilters.unshift("all");
			mapPicFilters = ["step", ["zoom"],
				true,
				TILES_PICTURES_ZOOM, mapPicFilters
			];
		}

		if(this.map) {
			if(reloadMapStyle) {
				this.map.reloadLayersStyles();
			}

			const allUsers = this.map.getVisibleUsers().includes("geovisio");
			if(mapSeqFilters && allUsers) {
				mapSeqFilters = ["step", ["zoom"],
					true,
					7, mapSeqFilters
				];
			}
			
			this.map.filterUserLayersContent("sequences", mapSeqFilters);
			this.map.filterUserLayersContent("pictures", mapPicFilters);
			if(
				!skipZoomIn
				&& (
					mapSeqFilters !== null
					|| mapPicFilters !== null
					|| (this._mapFilters.theme !== null && this._mapFilters.theme !== MAP_THEMES.DEFAULT)
				)
				&& allUsers
				&& this.map.getZoom() < 7
				&& !this.map._hasGridStats()
			) {
				this.map.easeTo({ zoom: 7 });
			}
		}

		/**
		 * Event for filters changes
		 *
		 * @event filters-changed
		 * @memberof Viewer
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} [detail.minDate] The minimum date in time range (ISO format)
		 * @property {string} [detail.maxDate] The maximum date in time range (ISO format)
		 * @property {string} [detail.type] Camera type (equirectangular, flat, null/empty string for both)
		 * @property {string} [detail.camera] Camera make and model
		 * @property {string} [detail.theme] Map theme
		 * @property {number[]} [detail.qualityscore] QualityScore values, as a list of 1 to 5 grades
		 */
		const event = new CustomEvent("filters-changed", { detail: Object.assign({}, this._mapFilters) });
		this.dispatchEvent(event);
	}
}

export {
	Viewer as default, // eslint-disable-line import/no-unused-modules
	Viewer, // eslint-disable-line import/no-unused-modules
	PSV_ZOOM_DELTA,
	PSV_ANIM_DURATION,
	PIC_MAX_STAY_DURATION,
};
