import { TILES_PICTURES_ZOOM } from "./Map";
import { BASE_PANORAMA_ID } from "./Utils";

/**
 * API contains various utility functions to communicate with the backend
 *
 * @param {string} endpoint The API endpoint. It corresponds to the <a href="https://github.com/radiantearth/stac-api-spec/blob/main/overview.md#example-landing-page">STAC landing page</a>, with all links describing the API capabilites.
 * @param {object} [options] Options received from viewer that may change API behaviour
 * @param {string|object} [options.style] General map style
 * @param {string} [options.tiles] API route serving pictures & sequences vector tiles
 * @param {boolean} [options.skipReadLanding] True to not call API landing page automatically (defaults to false)
 * @param {object} [options.fetch] Set custom options for fetch calls made against API ([same syntax as fetch options parameter](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters))
 * @param {string[]} [options.users] List of initial user IDs to load map styles for.
 * @private
 */
export default class API {
	constructor(endpoint, options = {}) {
		if(endpoint === null || endpoint === undefined || typeof endpoint !== "string") {
			throw new Error("endpoint parameter is empty or not a valid string");
		}

		// Parse local endpoints
		if(endpoint.startsWith("/")) {
			endpoint = window.location.href.split("/").slice(0, 3).join("/") + endpoint;
		}

		// Check endpoint
		if(!API.isValidHttpUrl(endpoint)) {
			throw new Error(`endpoint parameter is not a valid URL: ${endpoint}`);
		}

		this._endpoint = endpoint;
		this._isReady = 0;
		this._dataBbox = null;
		this._fetchOpts = options?.fetch || {};
		this._metadata = {};

		if(options.skipReadLanding) { return; }
		this._readLanding = fetch(endpoint, this._getFetchOptions())
			.then(res => res.json())
			.then(landing => this._parseLanding(landing, options))
			.catch(e => {
				this._isReady = -1;
				console.error(e);
				return Promise.reject("Viewer failed to communicate with API");
			})
			.then(() => this._loadMapStyles(options.style, options.users))
			.then(() => {
				this._isReady = 1;
				return "API is ready";
			});
	}

	/**
	 * This function resolves when API is ready to be used
	 *
	 * @returns {Promise} Resolves when API is ready
	 */
	onceReady() {
		if(this._isReady == -1) {
			return Promise.reject("Viewer failed to communicate with API");
		}
		else if(this._isReady == 1) {
			return Promise.resolve("API is ready");
		}
		else {
			return this._readLanding;
		}
	}

	/**
	 * Check if API is ready to be used
	 *
	 * @returns {boolean} True if ready
	 */
	isReady() {
		return this._isReady == 1;
	}

	/**
	 * List of available features offered by API
	 * @returns {string[]} Keywords of enabled features
	 */
	getAvailableFeatures() {
		return Object.entries(this._endpoints).filter(e => e[1] !== null).map(e => e[0]);
	}

	/**
	 * List of unavailable features on API
	 * @returns {string[]} Keywords of disabled features
	 */
	getUnavailableFeatures() {
		return Object.entries(this._endpoints).filter(e => e[1] === null).map(e => e[0]);
	}

	/**
	 * Interprets JSON landing page and store important information
	 *
	 * @private
	 */
	_parseLanding(landing, options) {
		this._endpoints = {
			"collections": null,
			"search": null,
			"style": null,
			"user_style": null,
			"tiles": options?.tiles || null,
			"user_tiles": null,
			"user_search": null,
			"collection_preview": null,
			"item_preview": null,
			"rss": null,
			"report": null,
		};

		if(!landing || !landing.links || !Array.isArray(landing.links)) {
			throw new Error("API Landing page doesn't contain 'links' list");
		}

		if(!landing.stac_version.startsWith("1.")) {
			throw new Error(`API is not in a supported STAC version (Panoramax viewer supports only 1.x, API is ${landing.stac_version})`);
		}

		// Read metadata
		this._metadata.name = landing.title || "Unnamed";
		this._metadata.stac_version = landing.stac_version;
		this._metadata.geovisio_version = landing.geovisio_version;

		// Read links
		const supportedLinks = [
			{
				rel: "search",
				type: "application/geo+json",
				endpointId: "search",
				mandatory: true,
				missingIssue: "No direct access to pictures metadata."
			},
			{
				rel: "data",
				type: "application/json",
				endpointId: "collections",
				mandatory: true,
				missingIssue: "No way for viewer to access sequences."
			},
			{
				rel: "data",
				type: "application/rss+xml",
				endpointId: "rss"
			},
			{
				rel: "xyz",
				type: "application/vnd.mapbox-vector-tile",
				endpointId: "tiles"
			},
			{
				rel: "xyz-style",
				type: "application/json",
				endpointId: "style"
			},
			{
				rel: "user-xyz-style",
				type: "application/json",
				endpointId: "user_style"
			},
			{
				rel: "user-xyz",
				type: "application/vnd.mapbox-vector-tile",
				endpointId: "user_tiles"
			},
			{
				rel: "user-search",
				type: "application/json",
				endpointId: "user_search",
				missingIssue: "Filter map data by user name will not be available."
			},
			{
				rel: "collection-preview",
				type: "image/jpeg",
				endpointId: "collection_preview",
				missingIssue: "Display of thumbnail could be slower."
			},
			{
				rel: "item-preview",
				type: "image/jpeg",
				endpointId: "item_preview",
				missingIssue: "Display of thumbnail could be slower."
			},
			{
				rel: "report",
				type: "application/json",
				endpointId: "report"
			}
		];

		const blockingIssues = [];
		const warningIssues = [];

		supportedLinks.forEach(sl => {
			// Find link in landing
			const ll = landing.links.find(ll => ll.rel == sl.rel && ll.type == sl.type);

			// No link found
			if(!ll) {
				if(!this._endpoints[sl.endpointId]) {
					let label = `API doesn't offer a '${sl.rel}' (${sl.type}) endpoint in its links`;
					if(sl.missingIssue) { label += `\n${sl.missingIssue}`; }

					// Display issue (either blocking or not)
					if(sl.mandatory) { blockingIssues.push(label); }
					else if(sl.missingIssue) { warningIssues.push(label); }
				}
			}
			// Link found
			else {
				// Invalid link
				if(!API.isValidHttpUrl(ll.href)) {
					throw new Error(`API endpoint '${ll.rel}' (${ll.type}) is not a valid URL: ${ll.href}`);
				}

				// Valid link -> stored in endpoints
				if(!this._endpoints[sl.endpointId]) {
					this._endpoints[sl.endpointId] = ll.href;
				}
			}
		});

		// Complex checks
		if(!this._endpoints.style && !this._endpoints.tiles) {
			warningIssues.push("API doesn't offer 'xyz' or 'xyz-style' endpoints in its links.\nMap widget will not be available.");
		}
		if(!this._endpoints.user_style && !this._endpoints.user_tiles) {
			warningIssues.push("API doesn't offer 'user-xyz' or 'user-xyz-style' endpoints in its links.\nFilter map data by user ID will not be available.");
		}

		// Display warnings & errors
		warningIssues.forEach(w => console.warn(w));
		if(blockingIssues.length > 0) {
			throw new Error(blockingIssues.join("\n"));
		}

		// Look for data BBox
		const bbox = landing?.extent?.spatial?.bbox;
		this._dataBbox = (
			bbox &&
			Array.isArray(bbox) &&
			bbox.length > 0 &&
			Array.isArray(bbox[0]) && bbox[0].length === 4
		) ?
			[[bbox[0][0], bbox[0][1]], [bbox[0][2], bbox[0][3]]]
			: null;
	}

	/**
	 * Loads all MapLibre Styles JSON needed at start.
	 * @param {string|object} style General map style
	 * @param {string[]} users List of user IDs to handle. Should include special user "geovisio" for general tiles loading.
	 * @returns {Promise} Resolves when style is ready.
	 */
	_loadMapStyles(style, users) {
		const mapUsers = new Set(users || []);

		// Load all necessary map styles
		this.mapStyle = { version: 8, sources: {}, layers: [], metadata: {} };
		const stylePromises = [ this.getMapStyle() ];

		// General map style
		if(typeof style === "string") {
			const fetchOpts = style.startsWith(this._endpoint) ? this._getFetchOptions() : undefined;
			stylePromises.push(fetch(style, fetchOpts).then(res => res.json()));
		}
		else if(typeof style === "object") {
			stylePromises.push(Promise.resolve(style));
		}

		// By-user style
		[...mapUsers].filter(mu => mu !== "geovisio").forEach(mu => {
			stylePromises.push(this.getUserMapStyle(mu, true));
		});

		return Promise.all(stylePromises)
			.then(styles => {
				const overridableProps = [
					"bearing", "center", "glyphs", "light", "name",
					"pitch", "sky", "sprite", "terrain", "transition", "zoom"
				];

				styles.forEach(style => {
					overridableProps.forEach(p => {
						if(style[p]) { this.mapStyle[p] = style[p] || this.mapStyle[p]; }
					});
					Object.assign(this.mapStyle.sources, style?.sources || {});
					Object.assign(this.mapStyle.metadata, style?.metadata || {});
					this.mapStyle.layers = this.mapStyle.layers.concat(style?.layers || []);
				});
			})
			.catch(e => console.error(e));
	}

	/**
	 * Get the defaults fetch options to pass during API calls
	 *
	 * @private
	 * @returns {object} The fetch options
	 */
	_getFetchOptions() {
		return Object.assign({
			signal: AbortSignal.timeout(15000)
		}, this._fetchOpts);
	}

	/**
	 * Get the RequestTransformFunction for MapLibre to handle fetch options
	 *
	 * @private
	 * @returns {function} The RequestTransformFunction
	 */
	_getMapRequestTransform() {
		const fetchOpts = this._getFetchOptions();
		delete fetchOpts.signal;
		// Only if tiles endpoint is enabled and fetch options set
		if(Object.keys(fetchOpts).length > 0) {
			return (url) => {
				// As MapLibre will use this function for all its calls
				// We must make sure fetch options are sent only for
				// the STAC API calls, particularly the tiles endpoint
				if(url.startsWith(this._endpoint)) {
					return {
						url,
						...fetchOpts
					};
				}
			};
		}
	}

	/**
	 * Get sequence GeoJSON representation
	 * 
	 * @param {string} seqId The sequence ID
	 * @param {string} [next] The next link URL (only for internals)
	 * @param {object} [data] The previous dataset (only for internals)
	 * @returns {Promise} Resolves on sequence GeoJSON
	 */
	async getSequenceItems(seqId, next = null, data = null) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		try {
			API.isIdValid(seqId);
			return fetch(
				next || `${this._endpoints.collections}/${seqId}/items`,
				this._getFetchOptions()
			)
				.then(res => res.json())
				.then(res => {
					// Merge previous data with current page
					let nextData = res;
					if(data) { nextData.features = data.features.concat(nextData.features); }

					// Handle pagination for next link
					const nextLink = res.links.find(l => l.rel === "next");
					if(nextLink) { return this.getSequenceItems(seqId, nextLink.href, nextData); }
					else { return nextData; }
				});
		}
		catch(e) {
			return Promise.reject(e);
		}
	}

	/**
	 * Get full URL for listing pictures around a specific location
	 *
	 * @param {number} lat Latitude
	 * @param {number} lon Longitude
	 * @param {number} [factor] The radius to search around (in degrees)
	 * @param {number} [limit] Max amount of pictures to retrieve
	 * @param {string} [seqId] The sequence ID to filter on (by default, no filter)
	 * @returns {string} The corresponding URL
	 */
	getPicturesAroundCoordinatesUrl(lat, lon, factor = 0.0005, limit, seqId) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }

		if(isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
			throw new Error("lat and lon parameters should be valid numbers");
		}

		const bbox = [ lon - factor, lat - factor, lon + factor, lat + factor ].map(d => d.toFixed(4)).join(",");
		const lim = limit ? `&limit=${limit}` : "";
		const seq = seqId ? `&collections=${seqId}`: "";
		return `${this._endpoints.search}?bbox=${bbox}${lim}${seq}`;
	}

	/**
	 * Get list of pictures around a specific location
	 *
	 * @param {number} lat Latitude
	 * @param {number} lon Longitude
	 * @param {number} [factor] The radius to search around (in degrees)
	 * @param {number} [limit] Max amount of pictures to retrieve
	 * @param {string} [seqId] The sequence ID to filter on (by default, no filter)
	 * @returns {object} The GeoJSON feature collection
	 */
	getPicturesAroundCoordinates(lat, lon, factor, limit, seqId) {
		return fetch(this.getPicturesAroundCoordinatesUrl(lat, lon, factor, limit, seqId), this._getFetchOptions())
			.then(res => res.json());
	}

	/**
	 * Get full URL for retrieving a specific picture metadata
	 *
	 * @param {string} picId The picture unique identifier
	 * @param {string} [seqId] The sequence ID
	 * @returns {string} The corresponding URL
	 */
	getPictureMetadataUrl(picId, seqId) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }

		if(API.isIdValid(picId)) {
			if(seqId) { return `${this._endpoints.collections}/${seqId}/items/${picId}`; }
			else { return `${this._endpoints.search}?ids=${picId}`; }
		}
	}

	/**
	 * Get JSON style for general vector tiles
	 * @return {Promise} The MapLibre JSON style
	 * @fires Error If API is not ready, or no style defined.
	 */
	getMapStyle() {
		if(this.isReady()) { return this.mapStyle; }

		let res;
		// Directly available style
		if(this._endpoints.style) {
			res = this._endpoints.style;
		}
		// Vector tiles URL, embed in a minimal JSON style
		else if(this._endpoints.tiles) {
			res = {
				"version": 8,
				"sources": {
					"geovisio": {
						"type": "vector",
						"tiles": [ this._endpoints.tiles ],
						"minzoom": 0,
						"maxzoom": TILES_PICTURES_ZOOM
					}
				}
			};
		}
		// No endpoints : try fallback for GeoVisio API <= 2.0.1
		else {
			res = fetch(`${this._endpoint}/map/14/0/0.mvt`, this._getFetchOptions()).then(() => {
				this._endpoints.tiles = `${this._endpoint}/map/{z}/{x}/{y}.mvt`;
				console.log("Using fallback endpoint for vector tiles");
				return this.getMapStyle();
			}).catch(e => {
				console.error(e);
				return Promise.reject(new Error("API doesn't offer a vector tiles endpoint"));
			});
		}

		// Call fetch if URL
		if(typeof res === "string") {
			return fetch(res, this._getFetchOptions()).then(res => res.json());
		}
		// Send JSON style directly
		else {
			return Promise.resolve(res);
		}
	}

	/**
	 * Get JSON style for specific-user vector tiles
	 * @param {string} userId The user UUID
	 * @param {boolean} [skipReadyCheck=false] Skip check for API readyness
	 * @return {Promise} The MapLibre JSON style
	 * @fires Error If API is not ready, or no style defined.
	 */
	getUserMapStyle(userId, skipReadyCheck = false) {
		if(!skipReadyCheck && !this.isReady()) { return Promise.reject(new Error("API is not ready to use")); }
		if(!userId) { return Promise.reject(new Error("Parameter userId is empty")); }

		let res;
		// Directly available style
		if(this._endpoints.user_style) {
			res = this._endpoints.user_style.replace(/\{userId\}/g, userId);
		}
		// Vector tiles URL, embed in a minimal JSON style
		else if(this._endpoints.user_tiles) {
			res = {
				"version": 8,
				"sources": {
					[`geovisio_${userId}`]: {
						"type": "vector",
						"tiles": [ this._endpoints.user_tiles.replace(/\{userId\}/g, userId) ],
						"minzoom": 0,
						"maxzoom": TILES_PICTURES_ZOOM
					}
				}
			};
		}

		if(!res) {
			return Promise.reject(new Error("API doesn't offer map style for specific user"));
		}
		// Call fetch if URL
		else if(typeof res === "string") {
			return fetch(res, this._getFetchOptions()).then(res => res.json());
		}
		// Send JSON style directly
		else {
			return Promise.resolve(res);
		}
	}

	/**
	 * Find the thumbnail URL for a given picture
	 *
	 * @param {object} picture The picture GeoJSON feature
	 * @returns {string} The thumbnail URL, or null if not found
	 * @private
	 */
	findThumbnailInPictureFeature(picture) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		if(!picture || !picture.assets) { return null; }

		let visualFallback = null;
		for(let a of Object.values(picture.assets)) {
			if(a.roles.includes("thumbnail") && a.type == "image/jpeg" && API.isValidHttpUrl(a.href)) {
				return a.href;
			}
			else if(a.roles.includes("visual") && a.type == "image/jpeg" && API.isValidHttpUrl(a.href)) {
				visualFallback = a.href;
			}
		}
		return visualFallback;
	}

	/**
	 * Get a picture thumbnail URL for a given sequence
	 *
	 * @param {string} seqId The sequence ID
	 * @param {object} [seq] The sequence metadata (with links) if already loaded
	 * @returns {Promise} Promise resolving on the picture thumbnail URL, or null if not found
	 */
	getPictureThumbnailURLForSequence(seqId, seq) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }

		// Look for a dedicated endpoint in API
		if(this._endpoints.collection_preview) {
			return Promise.resolve(this._endpoints.collection_preview.replace("{id}", seqId));
		}

		// Check if a preview link exists in sequence metadata
		if(seq && Array.isArray(seq.links) && seq.links.length > 0) {
			let preview = seq.links.find(l => l.rel === "preview" && l.type === "image/jpeg");
			if(preview && API.isValidHttpUrl(preview.href)) {
				return Promise.resolve(preview.href);
			}
		}

		// Otherwise, search for a single picture in collection
		const url = `${this._endpoints.search}?limit=1&collections=${seqId}`;

		return fetch(url, this._getFetchOptions())
			.then(res => res.json())
			.then(res => {
				if(!Array.isArray(res.features) || res.features.length == 0) {
					return null;
				}

				return this.findThumbnailInPictureFeature(res.features.pop());
			});
	}

	/**
	 * Get thumbnail URL for a specific picture
	 *
	 * @param {string} picId The picture unique identifier
	 * @param {string} [seqId] The sequence ID
	 * @returns {Promise} The corresponding URL on resolve, or undefined if no thumbnail could be found
	 */
	getPictureThumbnailURL(picId, seqId) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		
		if(!picId) { return Promise.resolve(null); }

		// Look for a dedicated endpoint in API
		if(this._endpoints.item_preview) {
			return Promise.resolve(this._endpoints.item_preview.replace("{id}", picId));
		}

		// Pic + sequence IDs defined -> use direct item metadata
		if(picId && seqId) {
			return fetch(`${this._endpoints.collections}/${seqId}/items/${picId}`, this._getFetchOptions())
				.then(res => res.json())
				.then(picture => {
					return picture ? this.findThumbnailInPictureFeature(picture) : null;
				});
		}

		// Picture ID only -> use search as fallback
		return fetch(`${this._endpoints.search}?ids=${picId}`, this._getFetchOptions())
			.then(res => res.json())
			.then(res => {
				if(!res || !Array.isArray(res.features) || res.features.length == 0) { return null; }
				return this.findThumbnailInPictureFeature(res.features.pop());
			});
	}

	/**
	 * Get the RSS feed URL with map parameters (if map is enabled)
	 * 
	 * @param {LngLatBounds} [bbox] The map current bounding box, or null if not available
	 * @returns {string} The URL, or null if no RSS feed is available
	 */
	getRSSURL(bbox) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		
		if(this._endpoints.rss) {
			let url = this._endpoints.rss;
			if(bbox) {
				url += url.includes("?") ? "&": "?";
				url += "bbox=" + [bbox.getWest(), bbox.getSouth(), bbox.getEast(), bbox.getNorth()].join(",");
			}
			return url;
		}
		else {
			return null;
		}
	}

	/**
	 * Get full URL for retrieving a specific sequence metadata
	 *
	 * @param {string} seqId The sequence ID
	 * @returns {string} The corresponding URL
	 */
	getSequenceMetadataUrl(seqId) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		return `${this._endpoints.collections}/${seqId}`;
	}

	/**
	 * Get available data bounding box
	 *
	 * @returns {LngLatBoundsLike} The bounding box or null if not available
	 */
	getDataBbox() {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }

		return this._dataBbox;
	}

	/**
	 * Look for user ID based on user name query
	 * @param {string} query The user name to look for
	 * @returns {Promise} Resolves on list of potential users
	 */
	searchUsers(query) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		if(!this._endpoints.user_search) { throw new Error("User search is not available"); }

		return fetch(`${this._endpoints.user_search}?q=${query}`, this._getFetchOptions())
			.then(res => res.json())
			.then(res => {
				return res?.features || null;
			});
	}

	/**
	 * Get user name based on its ID
	 * @param {string} userId The user UUID
	 * @returns {Promise} Resolves on user name
	 */
	getUserName(userId) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		if(!this._endpoints.user_search) { throw new Error("User search is not available"); }

		return fetch(this._endpoints.user_search.replace(/\/search$/, `/${userId}`), this._getFetchOptions())
			.then(res => res.json())
			.then(res => {
				return res?.name || null;
			});
	}

	/**
	 * Send a report to API
	 * @param {object} data The input form data
	 * @returns {Promise} Resolves on report sent
	 */
	sendReport(data) {
		if(!this.isReady()) { throw new Error("API is not ready to use"); }
		if(!this._endpoints.report) { throw new Error("Report sending is not available"); }

		const opts = {
			...this._getFetchOptions(),
			method: "POST",
			body: JSON.stringify(data),
			headers: { "Content-Type": "application/json" },
		};
		return fetch(this._endpoints.report, opts)
			.then(async res => {
				if(res.status >= 400) {
					let txt = await res.text();
					try {
						txt = JSON.parse(txt)["message"];
					}
					catch(e) {} // eslint-disable-line no-empty
					return Promise.reject(txt);
				}
				return res.json();
			});
	}

	/**
	 * Checks URL string validity
	 *
	 * @param {string} str The URL to check
	 * @returns {boolean} True if valid
	 */
	static isValidHttpUrl(str) {
		let url;

		try {
			url = new URL(str);
		} catch (_) {
			return false;
		}

		return url.protocol === "http:" || url.protocol === "https:";
	}

	/**
	 * Checks picture or sequence ID validity
	 *
	 * @param {string} id The ID to check
	 * @returns {boolean} True if valid
	 * @throws {Error} If not valid
	 */
	static isIdValid(id) {
		if(!id || typeof id !== "string" || id.length === 0 || id === BASE_PANORAMA_ID) {
			throw new Error("id should be a valid picture unique identifier");
		}
		return true;
	}
}
