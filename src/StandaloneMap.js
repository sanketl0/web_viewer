import CoreView from "./components/CoreView";
import Map from "./components/Map";
import { getUserLayerId } from "./utils/Map";
import { NavigationControl } from "!maplibre-gl"; // DO NOT REMOVE THE "!": bundled builds breaks otherwise !!!

/**
 * The standalone map viewer allows to see STAC pictures data as a map.
 * It only embeds a map (no 360° pictures viewer) with a minimal picture preview (thumbnail).
 * 
 * Note that you can use any of the [CoreView](#CoreView) class functions as well.
 * 
 * @param {string|Element} container The DOM element to create viewer into
 * @param {string} endpoint URL to API to use (must be a [STAC API](https://github.com/radiantearth/stac-api-spec/blob/main/overview.md))
 * @param {object} [options] Map options. Various settings can be passed, either the ones defined here, or any of [MapLibre GL settings](https://maplibre.org/maplibre-gl-js-docs/api/map/#map-parameters).
 * @param {string} [options.selectedSequence] The ID of sequence to highlight on load (defaults to none)
 * @param {string} [options.selectedPicture] The ID of picture to highlight on load (defaults to none)
 * @param {object} [options.fetchOptions=null] Set custom options for fetch calls made against API ([same syntax as fetch options parameter](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters))
 * @param {number} [options.minZoom=0] The minimum zoom level of the map (0-24).
 * @param {number} [options.maxZoom=24] The maximum zoom level of the map (0-24).
 * @param {string|object} [options.style] The map's MapLibre style. This can be an a JSON object conforming to the schema described in the [MapLibre Style Specification](https://maplibre.org/maplibre-gl-js-docs/style-spec/), or a URL string pointing to one.
 * @param {external:maplibre-gl.LngLatLike} [options.center=[0, 0]] The initial geographical centerpoint of the map. If `center` is not specified in the constructor options, MapLibre GL JS will look for it in the map's style object. If it is not specified in the style, either, it will default to `[0, 0]` Note: MapLibre GL uses longitude, latitude coordinate order (as opposed to latitude, longitude) to match GeoJSON.
 * @param {number} [options.zoom=0] The initial zoom level of the map. If `zoom` is not specified in the constructor options, MapLibre GL JS will look for it in the map's style object. If it is not specified in the style, either, it will default to `0`.
 * @param {external:maplibre-gl.LngLatBoundsLike} [options.bounds] The initial bounds of the map. If `bounds` is specified, it overrides `center` and `zoom` constructor options.
 * @param {string[]} [options.users] The IDs of users whom data should appear on map (defaults to all)
 * 
 * @property {Map} map The map widget
 */
class StandaloneMap extends CoreView {
	constructor(container, endpoint, options = {}) {
		super(container, endpoint, options);

		this.mapContainer = document.createElement("div");
		this.container.appendChild(this.mapContainer);

		// Init API
		this._api.onceReady().then(() => this._initMap());

		// Events handlers
		this.addEventListener("map:picture-click", e => this.select(e.detail.seqId, e.detail.picId));
		this.addEventListener("map:sequence-click", e => this.select(e.detail.seqId));
		this.addEventListener("select", this._onSelect.bind(this));
	}

	getClassName() {
		return "Map";
	}

	/**
	 * Ends all form of life in this object.
	 * 
	 * This is useful for Single Page Applications (SPA), to remove various event listeners.
	 */
	destroy() {
		super.destroy();

		// Delete sub-components
		this.map.destroy();
		delete this.map;

		// Clean-up DOM
		this.mapContainer.remove();
		this.container.innerHTML = "";
		this.container.classList.remove(...[...this.container.classList].filter(c => c.startsWith("gvs")));
	}

	/**
	 * Creates map object
	 * @private
	 */
	_initMap() {
		this._options.hash = true;

		// Override to avoid display of pictures symbols
		class MyMap extends Map {
			_getLayerStyleProperties(layer) {
				if(layer === "pictures_symbols") {
					return { layout: { visibility: "none" } };
				}
				else {
					return super._getLayerStyleProperties(layer);
				}
			}
		}
		
		this.map = new MyMap(this, this.mapContainer, this._options);
		this.map.addControl(new NavigationControl({ showCompass: false }));
		this.map.waitForEnoughMapLoaded().then(() => {
			this.map.reloadLayersStyles();
			this._loader.dismiss();
		});
	}

	/**
	 * Select event handler
	 * @private
	 * @param {object} e Event details
	 */
	_onSelect(e) {
		// Move thumbnail to match selected element
		if(e.detail.picId || e.detail.seqId) {
			const layer = e.detail.picId ? "pictures" : "sequences";
			const features = this.map.queryRenderedFeatures({
				layers: [...this.map._userLayers].map(l => getUserLayerId(l, layer)),
				filter: ["==", ["get", "id"], e.detail.picId || e.detail.seqId]
			});

			if(features.length >= 0 && features[0] != null) {
				this.map._attachPreviewToPictures({ features }, layer);
			}
		}
	}
}

export default StandaloneMap;