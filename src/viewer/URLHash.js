const MAP_FILTERS_JS2URL = {
	"minDate": "date_from",
	"maxDate": "date_to",
	"type": "pic_type",
	"camera": "camera",
	"theme": "theme",
	"qualityscore": "pic_score",
};
const MAP_FILTERS_URL2JS = Object.fromEntries(Object.entries(MAP_FILTERS_JS2URL).map(v => [v[1], v[0]]));
const UPDATE_HASH_EVENTS = [
	"psv:view-rotated", "psv:picture-loaded", "focus-changed",
	"filters-changed", "psv:transition-duration-changed",
	"map:background-changed", "map:users-changed", "pictures-navigation-changed",
];

/**
 * Updates the URL hash with various viewer information.
 * This doesn't handle the "map" parameter, which is managed by MapLibre GL JS
 *
 * Based on https://github.com/maplibre/maplibre-gl-js/blob/main/src/ui/hash.ts
 *
 * @returns {URLHash} `this`
 *
 * @private
 */
export default class URLHash extends EventTarget {
	constructor(viewer) {
		super();
		this._viewer = viewer;
		this._delay = null;
		this._hashChangeHandler = this._onHashChange.bind(this);

		// Only start changing after first initial load
		//   to avoid generating broken URL during load
		viewer.addEventListener("ready", () => {
			window.addEventListener("hashchange", this._hashChangeHandler, false);
			UPDATE_HASH_EVENTS.forEach(e => this._viewer.addEventListener(e, this._updateHash.bind(this)));
		}, { once: true });
	}

	/**
	 * Ends all form of life in this object.
	 */
	destroy() {
		window.removeEventListener("hashchange", this._hashChangeHandler);
		delete this._hashChangeHandler;
		this._viewer?.map?.off("moveend", this._updateHash);
		UPDATE_HASH_EVENTS.forEach(e => this._viewer.removeEventListener(e, this._updateHash));
		delete this._viewer;
		this._updateHash();
	}

	/**
	 * Start listening to map movend event
	 */
	bindMapEvents() {
		this._viewer.map.on("moveend", this._updateHash.bind(this));
	}

	/**
	 * Compute next hash parts
	 * @returns {object} Hash parameters
	 * @private
	 */
	_getHashParts() {
		let hashParts = {};

		if(typeof this._viewer.psv.getTransitionDuration() == "number") {
			hashParts.speed = this._viewer.psv.getTransitionDuration();
		}

		if(![null, "any"].includes(this._viewer.getPicturesNavigation())) {
			hashParts.nav = this._viewer.getPicturesNavigation();
		}

		const picMeta = this._viewer.psv.getPictureMetadata();
		if (picMeta) {
			hashParts.pic = picMeta.id;
			hashParts.xyz = this._getXyzHashString();
		}

		if(this._viewer.map) {
			hashParts.map = this._getMapHashString();
			hashParts.focus = "pic";
			if(this._viewer.isMapWide()) { hashParts.focus = "map"; }
			if(!this._viewer.popupContainer.classList.contains("gvs-hidden")) { hashParts.focus = "meta"; }
			if(this._viewer.map.hasTwoBackgrounds() && this._viewer.map.getBackground()) {
				hashParts.background = this._viewer.map.getBackground();
			}

			const vu = this._viewer.map.getVisibleUsers();
			if(vu.length > 1 || !vu.includes("geovisio")) {
				hashParts.users = vu.join(",");
			}

			if(this._viewer._mapFilters) {
				for(let k in MAP_FILTERS_JS2URL) {
					if(this._viewer._mapFilters[k]) {
						hashParts[MAP_FILTERS_JS2URL[k]] = this._viewer._mapFilters[k];
					}
				}
				if(hashParts.pic_score) {
					const mapping = [null, "E", "D", "C", "B", "A"];
					hashParts.pic_score = hashParts.pic_score.map(v => mapping[v]).join("");
				}
			}
		}
		else {
			hashParts.map = "none";
		}
		return hashParts;
	}

	/**
	 * Get the hash string with current map/psv parameters
	 * @return {string} The hash, starting with #
	 */
	getHashString() {
		let hash = "";

		Object.entries(this._getHashParts())
			.sort((a,b) => a[0].localeCompare(b[0]))
			.forEach(entry => {
				let [ hashName, value ] = entry;
				let found = false;
				const parts = hash.split("&").map(part => {
					const key = part.split("=")[0];
					if (key === hashName) {
						found = true;
						return `${key}=${value}`;
					}
					return part;
				}).filter(a => a);
				if (!found) {
					parts.push(`${hashName}=${value}`);
				}
				hash = `${parts.join("&")}`;
			});

		return `#${hash}`.replace(/^#+/, "#");
	}

	/**
	 * Transforms window.location.hash into key->value object
	 * @return {object} Key-value read from hash
	 * @private
	 */
	_getCurrentHash() {
		// Get the current hash from location, stripped from its number sign
		const hash = window.location.hash.replace("#", "");

		// Split the parameter-styled hash into parts and find the value we need
		let keyvals = {};
		hash.split("&").map(
			part => part.split("=")
		)
			.filter(part => part[0] !== undefined && part[0].length > 0)
			.forEach(part => {
				keyvals[part[0]] = part[1];
			});
		
		// If hash is compressed
		if(keyvals.s) {
			const shortVals = Object.fromEntries(
				keyvals.s
					.split(";")
					.map(kv => [kv[0], kv.substring(1)])
			);

			keyvals = {};

			// Used letters: b c d e f k m n p q s t u v
			// Focus
			if(shortVals.f === "m") { keyvals.focus = "map"; }
			else if(shortVals.f === "p") { keyvals.focus = "pic"; }
			else if(shortVals.f === "t") { keyvals.focus = "meta"; }

			// Speed
			if(shortVals.s !== "") { keyvals.speed = parseFloat(shortVals.s) * 100; }

			// Nav
			if(shortVals.n === "a") { keyvals.nav = "any"; }
			else if(shortVals.n === "s") { keyvals.nav = "seq"; }
			if(shortVals.n === "n") { keyvals.nav = "none"; }

			// Pic
			if(shortVals.p !== "") { keyvals.pic = shortVals.p; }

			// XYZ
			if(shortVals.c !== "") { keyvals.xyz = shortVals.c; }

			// Map
			if(shortVals.m !== "") { keyvals.map = shortVals.m; }

			// Date
			if(shortVals.d !== "") { keyvals.date_from = shortVals.d; }
			if(shortVals.e !== "") { keyvals.date_to = shortVals.e; }

			// Pic type
			if(shortVals.t === "f") { keyvals.pic_type = "flat"; }
			else if(shortVals.t === "e") { keyvals.pic_type = "equirectangular"; }

			// Camera
			if(shortVals.k !== "") { keyvals.camera = shortVals.k; }

			// Theme
			if(shortVals.v === "d") { keyvals.theme = "default"; }
			else if(shortVals.v === "a") { keyvals.theme = "age"; }
			else if(shortVals.v === "t") { keyvals.theme = "type"; }
			else if(shortVals.v === "s") { keyvals.theme = "score"; }

			// Background
			if(shortVals.b === "s") { keyvals.background = "streets"; }
			else if(shortVals.b === "a") { keyvals.background = "aerial"; }

			// Users
			if(shortVals.u !== "") { keyvals.users = shortVals.u; }

			// Photoscore
			if(shortVals.q !== "") { keyvals.pic_score = shortVals.q; }
		}

		return keyvals;
	}

	/**
	 * Get string representation of map position
	 * @returns {string} zoom/lat/lon or zoom/lat/lon/bearing/pitch
	 * @private
	 */
	_getMapHashString() {
		const center = this._viewer.map.getCenter(),
			zoom = Math.round(this._viewer.map.getZoom() * 100) / 100,
			// derived from equation: 512px * 2^z / 360 / 10^d < 0.5px
			precision = Math.ceil((zoom * Math.LN2 + Math.log(512 / 360 / 0.5)) / Math.LN10),
			m = Math.pow(10, precision),
			lng = Math.round(center.lng * m) / m,
			lat = Math.round(center.lat * m) / m,
			bearing = this._viewer.map.getBearing(),
			pitch = this._viewer.map.getPitch();
		let hash = `${zoom}/${lat}/${lng}`;

		if (bearing || pitch) hash += (`/${Math.round(bearing * 10) / 10}`);
		if (pitch) hash += (`/${Math.round(pitch)}`);

		return hash;
	}

	/**
	 * Get PSV view position as string
	 * @returns {string} x/y/z
	 * @private
	 */
	_getXyzHashString() {
		const xyz = this._viewer.psv.getXYZ();
		const x = xyz.x.toFixed(2),
			y = xyz.y.toFixed(2),
			z = Math.round(xyz.z || 0);
		return `${x}/${y}/${z}`;
	}

	/**
	 * Updates map and PSV according to current hash values
	 * @private
	 */
	_onHashChange() {
		let vals = this._getCurrentHash();

		// Restore selected picture
		if(vals.pic) {
			const picIds = vals.pic.split(";"); // Handle multiple IDs coming from OSM
			if(picIds.length > 1) {
				console.warn("Multiple picture IDs passed in URL, only first one kept");
			}
			this._viewer.select(null, picIds[0]);
		}
		else {
			this._viewer.select();
		}

		// Change focus
		if(vals.focus && ["map", "pic"].includes(vals.focus)) {
			this._viewer.setPopup(false);
			this._viewer.setFocus(vals.focus);
		}
		if(vals.focus && vals.focus == "meta") {
			this._viewer._widgets._showPictureMetadataPopup();
		}

		// Change speed
		if(vals.speed !== undefined) {
			this._viewer.psv.setTransitionDuration(vals.speed);
		}

		// Change map position & users
		if(vals.map && this._viewer.map) {
			const mapOpts = this.getMapOptionsFromHashString(vals.map);
			if(mapOpts) {
				this._viewer.map.jumpTo(mapOpts);
			}

			let vu = (vals.users || "").split(",");
			if(vu.length === 0 || (vu.length === 1 && vu[0].trim() === "")) { vu = ["geovisio"]; }
			this._viewer.map.setVisibleUsers(vu);
		}

		// Change xyz position
		if(vals.xyz) {
			const coords = this.getXyzOptionsFromHashString(vals.xyz);
			this._viewer.psv.setXYZ(coords.x, coords.y, coords.z);
		}

		// Change map filters
		this._viewer.setFilters(this.getMapFiltersFromHashVals(vals));

		// Change map background
		if(["aerial", "streets"].includes(vals.background)) {
			this._viewer.map.setBackground(vals.background);
		}

		// Change pictures navigation mode
		if(["pic", "any", "seq"].includes(vals.nav)) {
			this._viewer.setPicturesNavigation(vals.nav);
		}
	}

	/**
	 * Get short link URL (hash replaced by Base64)
	 * @returns {str} The short link URL
	 */
	getShortLink(baseUrl) {
		const url = new URL(baseUrl);
		const hashParts = this._getHashParts();
		const shortVals = {
			f: (hashParts.focus || "").substring(0, 1),
			s: !isNaN(parseInt(hashParts.speed)) ? Math.floor(parseInt(hashParts.speed)/100) : undefined,
			n: (hashParts.nav || "").substring(0, 1),
			p: hashParts.pic,
			c: hashParts.xyz,
			m: hashParts.map,
			d: hashParts.date_from,
			e: hashParts.date_to,
			t: (hashParts.pic_type || "").substring(0, 1),
			k: hashParts.camera,
			v: (hashParts.theme || "").substring(0, 1),
			b: (hashParts.background || "").substring(0, 1),
			u: hashParts.users,
			q: hashParts.pic_score,
		};
		const short = Object.entries(shortVals)
			.filter(([,v]) => v != undefined && v != "")
			.map(([k,v]) => `${k}${v}`)
			.join(";");
		url.hash = `s=${short}`;
		return url;
	}

	/**
	 * Extracts from hash parsed keys all map filters values
	 * @param {*} vals Hash keys
	 * @returns {object} Map filters
	 */
	getMapFiltersFromHashVals(vals) {
		const newMapFilters = {};
		for(let k in MAP_FILTERS_URL2JS) {
			if(vals[k]) {
				newMapFilters[MAP_FILTERS_URL2JS[k]] = vals[k];
			}
		}
		if(newMapFilters.qualityscore) {
			let values = newMapFilters.qualityscore.split("");
			const mapping = {"A": 5, "B": 4, "C": 3, "D": 2, "E": 1};
			newMapFilters.qualityscore = values.map(v => mapping[v]);
		}
		return newMapFilters;
	}

	/**
	 * Extracts from string map position
	 * @param {string} str The map position as hash string
	 * @returns {object} { center, zoom, pitch, bearing }
	 */
	getMapOptionsFromHashString(str) {
		const loc = str.split("/");
		if (loc.length >= 3 && !loc.some(v => isNaN(v))) {
			const res = {
				center: [+loc[2], +loc[1]],
				zoom: +loc[0],
				pitch: +(loc[4] || 0)
			};

			if(this._viewer.map) {
				res.bearing = this._viewer.map.dragRotate.isEnabled() && this._viewer.map.touchZoomRotate.isEnabled() ? +(loc[3] || 0) : this._viewer.map.getBearing();
			}

			return res;
		}
		else { return null; }
	}

	/**
	 * Extracts from string xyz position
	 * @param {string} str The xyz position as hash string
	 * @returns {object} { x, y, z }
	 */
	getXyzOptionsFromHashString(str) {
		const loc = str.split("/");
		if (loc.length === 3 && !loc.some(v => isNaN(v))) {
			const res = {
				x: +loc[0],
				y: +loc[1],
				z: +loc[2]
			};

			return res;
		}
		else { return null; }
	}

	/**
	 * Changes the URL hash using current viewer parameters
	 * @private
	 */
	_updateHash() {
		if(this._delay) {
			clearTimeout(this._delay);
			this._delay = null;
		}

		this._delay = setTimeout(() => {
			const prevUrl = new URL(window.location.href);
			const nextUrl = new URL(window.location.href);
			nextUrl.hash = this._viewer ? this.getHashString() : "";

			// Skip hash update if no changes
			if(prevUrl.hash == nextUrl.hash) { return; }

			const prevPic = this._getCurrentHash().pic || "";
			const nextPic = this._viewer?.psv?.getPictureMetadata()?.id || "";

			const prevFocus = this._getCurrentHash().focus || "";
			const nextFocus = nextUrl.hash.includes("focus=meta") ? "meta" : (nextUrl.hash.includes("focus=map") ? "map" : "pic");

			try {
				// If different pic, add entry in browser history
				if(prevPic != nextPic) {
					window.history.pushState(window.history.state, null, nextUrl.href);
				}
				// If metadata popup is open, come back to pic/map
				else if(prevFocus != nextFocus && nextFocus == "meta") {
					window.history.pushState(window.history.state, null, nextUrl.href);
				}
				// If same pic, just update viewer params
				else {
					window.history.replaceState(window.history.state, null, nextUrl.href);
				}
				
				if(this._viewer) {
					const event = new CustomEvent("url-changed", { detail: {url: nextUrl.href}});
					this.dispatchEvent(event);
				}
			} catch (SecurityError) {
				// IE11 does not allow this if the page is within an iframe created
				// with iframe.contentWindow.document.write(...).
				// https://github.com/mapbox/mapbox-gl-js/issues/7410
			}
		}, 500);
	}
}
