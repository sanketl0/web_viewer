import "./CoreView.css";
import API from "../utils/API";
import { getTranslations } from "../utils/I18n";
import { DEFAULT_TILES } from "../utils/Map";
import { BASE_PANORAMA_ID, isInIframe, isInternetFast } from "../utils/Utils";
import PACKAGE_JSON from "../../package.json";
import Loader from "./Loader";


/**
 * Core view is an abstract class used for setting up any of the main Panoramax JS view components.
 * 
 * It is used to prepare API, internationalization, options checks... for Viewer, StandaloneMap and Editor classes.
 * 
 * @param {string|Element} container The DOM element to create viewer into
 * @param {string} endpoint URL to API to use (must be a [STAC API](https://github.com/radiantearth/stac-api-spec/blob/main/overview.md))
 * @param {object} [options] View options.
 * @param {string} [options.selectedSequence] The ID of sequence to highlight on load (defaults to none)
 * @param {string} [options.selectedPicture] The ID of picture to highlight on load (defaults to none)
 * @param {object} [options.fetchOptions=null] Set custom options for fetch calls made against API ([same syntax as fetch options parameter](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters))
 * @param {string|string[]} [options.users] List of user IDs to default use for display. Defaults to all users.
 * @param {string|object} [options.style] The map's MapLibre style. This can be an a JSON object conforming to the schema described in the [MapLibre Style Specification](https://maplibre.org/maplibre-gl-js-docs/style-spec/), or a URL string pointing to one. Defaults to OSMFR vector tiles.
 * 
 * @property {object} _t The translations labels
 * @property {string} _selectedSeqId The selected sequence ID
 * @property {string} _selectedPicId The selected picture ID
 * @property {API} _api The API handler
 * @property {Loader} _loader The initial loader message
 * @property {object} _options The stored options
 * @property {Element} container The DOM container
 */
export default class CoreView extends EventTarget {
	constructor(container, endpoint, options = {}) {
		super();

		this._options = options;
		if(this._options == null) { this._options = {}; }
		if(!this._options.users) { this._options.users = ["geovisio"]; }
		if(typeof this._options.users === "string") { this._options.users = [this._options.users]; }
		if(!this._options.style) { this._options.style = DEFAULT_TILES; }

		if(!this._options.testing) {
			// Display version in logs
			console.info(`📷 Panoramax ${this.getClassName()} - Version ${PACKAGE_JSON.version} (${__COMMIT_HASH__})

🆘 Issues can be reported at ${PACKAGE_JSON.repository.url}`);
		}

		// Translations
		this._t = getTranslations(this._options.lang);

		// Internet speed check
		this._isInternetFast = null;
		isInternetFast().then(isFast => this._isInternetFast = isFast);

		// Selected IDs
		this._selectedSeqId = this._options.selectedSequence || null;
		this._selectedPicId = this._options.selectedPicture || null;

		// Container init
		this.container = typeof container === "string" ? document.getElementById(container) : container;
		if(!(this.container instanceof Element)) { throw new Error("Container is not a valid HTML element, does it exist in your page ?"); }
		this.container.classList.add("gvs", `gvs-${this.getClassName().toLocaleLowerCase()}`);
		if(isInIframe()) { this.container.classList.add("gvs-iframed"); }

		// Loader init
		this.loaderContainer = document.createElement("div");
		this.container.appendChild(this.loaderContainer);
		this._loader = new Loader(this, this.loaderContainer);

		// API init)
		endpoint = (endpoint || "").replace("/api/search", "/api");
		try {
			this._api = new API(endpoint, {
				users: this._options.users,
				fetch: this._options?.fetchOptions,
				style: this._options.style,
			});
			this._api.onceReady()
				.then(() => {
					let unavailable = this._api.getUnavailableFeatures();
					let available = this._api.getAvailableFeatures();
					available = unavailable.length === 0 ? "✅ All features available" : "✅ Available features: "+available.join(", ");
					unavailable = unavailable.length === 0 ? "" : "🚫 Unavailable features: "+unavailable.join(", ");
					console.info(`🌐 Connected to API "${this._api._metadata.name}" (${this._api._endpoint})
ℹ️ API runs STAC ${this._api._metadata.stac_version} ${this._api._metadata.geovisio_version ? "& GeoVisio "+this._api._metadata.geovisio_version : ""}
   ${available}
   ${unavailable}
`.trim());
				})
				.catch(e => this._loader.dismiss(e, this._t.gvs.error_api));
		}
		catch(e) {
			this._loader.dismiss(e, this._t.gvs.error_api);
		}
	}

	/**
	 * This allows to retrieve an always correct class name.
	 * This is crap, but avoids issues with Webpack & so on.
	 * 
	 * Each inheriting class must override this method.
	 */
	getClassName() {
		return "CoreView";
	}

	/**
	 * Ends all form of life in this object.
	 * 
	 * This is useful for Single Page Applications (SPA), to remove various event listeners.
	 */
	destroy() {
		delete this._options;
		delete this._t;
		delete this._api;
		delete this._loader;
		this.loaderContainer.remove();
		delete this.loaderContainer;
	}

	/**
	 * Is the view running in a small container (small embed or smartphone)
	 * @returns {boolean} True if container is small
	 */
	isWidthSmall() {
		return this.container?.offsetWidth < 576;
	}

	/**
	 * Is the view running in a small-height container (small embed or smartphone)
	 * @returns {boolean} True if container height is small
	 */
	isHeightSmall() {
		return this.container?.offsetHeight < 400;
	}
	
	/**
	 * Change the currently picture and/or sequence.
	 * Calling the method without parameters unselects.
	 * @param {string} [seqId] The sequence UUID
	 * @param {string} [picId] The picture UUID
	 * @param {boolean} [force=false] Force select even if already selected
	 */
	select(seqId = null, picId = null, force = false) {
		if(picId === BASE_PANORAMA_ID) { picId = null; }
		const prevSeqId = this._selectedSeqId || null;
		const prevPicId = this._selectedPicId || null;
		if(!force && prevPicId == picId && prevSeqId == seqId) { return; } // Avoid running if already selected

		this._selectedSeqId = seqId;
		this._selectedPicId = picId;

		/**
		 * Event for sequence/picture selection
		 *
		 * @event select
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} detail.seqId The selected sequence ID
		 * @property {string} detail.picId The selected picture ID (or null if not a precise picture clicked)
		 * @property {string} [detail.prevSeqId] The previously selected sequence ID (or null if none)
		 * @property {string} [detail.prevPicId] The previously selected picture ID (or null if none)
		 */
		this.dispatchEvent(new CustomEvent("select", {
			detail: {
				seqId,
				picId,
				prevSeqId,
				prevPicId,
			}
		}));
	}
}
