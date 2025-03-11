import "./Editor.css";
import CoreView from "./components/CoreView";
import Map from "./components/Map";
import Photo from "./components/Photo";
import BackgroundAerial from "./img/bg_aerial.jpg";
import BackgroundStreets from "./img/bg_streets.jpg";
import { linkMapAndPhoto, apiFeatureToPSVNode } from "./utils/Utils";
import { VECTOR_STYLES } from "./utils/Map";
import { SYSTEM as PSSystem } from "@photo-sphere-viewer/core";

const LAYER_HEADING_ID = "sequence-headings";

/**
 * Editor allows to focus on a single sequence, and preview what you edits would look like.
 * It shows both picture and map.
 * 
 * Note that you can use any of the [CoreView](#CoreView) class functions as well.
 * 
 * @param {string|Element} container The DOM element to create viewer into
 * @param {string} endpoint URL to API to use (must be a [STAC API](https://github.com/radiantearth/stac-api-spec/blob/main/overview.md))
 * @param {object} [options] View options.
 * @param {string} options.selectedSequence The ID of sequence to highlight on load. Must be always defined.
 * @param {string} [options.selectedPicture] The ID of picture to highlight on load (defaults to none)
 * @param {object} [options.fetchOptions=null] Set custom options for fetch calls made against API ([same syntax as fetch options parameter](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters))
 * @param {object} [options.raster] The MapLibre raster source for aerial background. This must be a JSON object following [MapLibre raster source definition](https://maplibre.org/maplibre-style-spec/sources/#raster).
 * @param {string} [options.background] Choose default map background to display (streets or aerial, if raster aerial background available). Defaults to street.
 * @param {string|object} [options.style] The map's MapLibre style. This can be an a JSON object conforming to the schema described in the [MapLibre Style Specification](https://maplibre.org/maplibre-gl-js-docs/style-spec/), or a URL string pointing to one.
 * 
 * @property {Map} map The map widget
 * @property {Photo} psv The photo widget
 */
export default class Editor extends CoreView {
	constructor(container, endpoint, options = {}){
		super(container, endpoint, Object.assign(options, { users: [] }));

		// Check sequence ID is set
		if(!this._selectedSeqId) { this._loader.dismiss({}, "No sequence is selected"); }

		// Create sub-containers
		this.psvContainer = document.createElement("div");
		this.mapContainer = document.createElement("div");
		this.container.appendChild(this.psvContainer);
		this.container.appendChild(this.mapContainer);

		// Init PSV
		try {
			this.psv = new Photo(this, this.psvContainer);
			this.psv._myVTour.datasource.nodeResolver = this._getNode.bind(this);
		}
		catch(e) {
			let err = !PSSystem.isWebGLSupported ? this._t.gvs.error_webgl : this._t.gvs.error_psv;
			this._loader.dismiss(e, err);
		}

		// Init map
		this._api.onceReady().then(() => {
			try {
				this.map = new Map(this, this.mapContainer, {
					raster: options.raster,
					background: options.background,
					supplementaryStyle: this._createMapStyle(),
					zoom: 15, // Hack to avoid _initMapPosition call
				});
				linkMapAndPhoto(this);
				this._loadSequence();
				this.map.once("load", () => {
					if(options.raster) { this._addMapBackgroundWidget(); }
					this._bindPicturesEvents();
				});

				// Override picMarker setRotation for heading preview
				const oldRot = this.map._picMarker.setRotation.bind(this.map._picMarker);
				this.map._picMarker.setRotation = h => {
					h = this._lastRelHeading === undefined ? h : h + this._lastRelHeading - this.psv.getPictureRelativeHeading();
					return oldRot(h);
				};
			}
			catch(e) {
				this._loader.dismiss(e, this._t.gvs.error_psv);
			}
		});

		// Events
		this.addEventListener("select", this._onSelect.bind(this));
	}

	getClassName() {
		return "Editor";
	}

	/**
	 * Create style for GeoJSON sequence data.
	 * @private
	 */
	_createMapStyle() {
		return {
			sources: {
				geovisio_editor_sequences: {
					type: "geojson",
					data: {"type": "FeatureCollection", "features": [] }
				}
			},
			layers: [
				{
					"id": "geovisio_editor_sequences",
					"type": "line",
					"source": "geovisio_editor_sequences",
					"layout": {
						...VECTOR_STYLES.SEQUENCES.layout
					},
					"paint": {
						...VECTOR_STYLES.SEQUENCES.paint
					},
				},
				{
					"id": "geovisio_editor_pictures",
					"type": "circle",
					"source": "geovisio_editor_sequences",
					"layout": {
						...VECTOR_STYLES.PICTURES.layout
					},
					"paint": {
						...VECTOR_STYLES.PICTURES.paint
					},
				}
			]
		};
	}

	/**
	 * Creates events handlers on pictures layer
	 * @private
	 */
	_bindPicturesEvents() {
		// Pictures events
		this.map.on("mousemove", "geovisio_editor_pictures", () => {
			this.map.getCanvas().style.cursor = "pointer";
		});

		this.map.on("mouseleave", "geovisio_editor_pictures", () => {
			this.map.getCanvas().style.cursor = "";
		});

		this.map.on("click", "geovisio_editor_pictures", this.map._onPictureClick.bind(this.map));
	}

	/**
	 * Displays currently selected sequence on map
	 * @private
	 */
	_loadSequence() {
		return this._api.getSequenceItems(this._selectedSeqId).then(seq => {
			// Hide loader after source load
			this.map.once("sourcedata", () => {
				this.map.setPaintProperty("geovisio_editor_sequences", "line-color", this.map._getLayerColorStyle("sequences"));
				this.map.setPaintProperty("geovisio_editor_pictures", "circle-color", this.map._getLayerColorStyle("pictures"));
				this.map.setLayoutProperty("geovisio_editor_sequences", "visibility", "visible");
				this.map.setLayoutProperty("geovisio_editor_pictures", "visibility", "visible");
				this.map.once("styledata", () => this._loader.dismiss());
			});

			// Create data source
			this._sequenceData = seq.features;
			this.map.getSource("geovisio_editor_sequences").setData({
				"type": "FeatureCollection",
				"features": [
					{
						"type": "Feature",
						"properties": {
							"id": this._selectedSeqId,
						},
						"geometry":
						{
							"type": "LineString",
							"coordinates": seq.features.map(p => p.geometry.coordinates)
						}
					},
					...seq.features.map(f => {
						f.properties.id = f.id;
						f.properties.sequences = [this._selectedSeqId];
						return f;
					})
				]
			});

			// Select picture if any
			if(this._selectedPicId) {
				const pic = seq.features.find(p => p.id === this._selectedPicId);
				if(pic) {
					this.select(this._selectedSeqId, this._selectedPicId, true);
					this.map.jumpTo({ center: pic.geometry.coordinates, zoom: 18 });
				}
				else {
					console.log("Picture with ID", pic, "was not found");
				}
			}
			// Show area of sequence otherwise
			else {
				const bbox = [
					...seq.features[0].geometry.coordinates,
					...seq.features[0].geometry.coordinates
				];

				for(let i=1; i < seq.features.length; i++) {
					const c = seq.features[i].geometry.coordinates;
					if(c[0] < bbox[0]) { bbox[0] = c[0]; }
					if(c[1] < bbox[1]) { bbox[1] = c[1]; }
					if(c[0] > bbox[2]) { bbox[2] = c[0]; }
					if(c[1] > bbox[3]) { bbox[3] = c[1]; }
				}

				this.map.fitBounds(bbox, {animate: false});
			}
		}).catch(e => this._loader.dismiss(e, this._t.gvs.error_api));
	}

	/**
	 * Get the PSV node for wanted picture.
	 * 
	 * @param {string} picId The picture ID
	 * @returns The PSV node
	 * @private
	 */
	_getNode(picId) {
		const f = this._sequenceData.find(f => f.properties.id === picId);
		const n = f ? apiFeatureToPSVNode(f, this._t, this._isInternetFast) : null;
		if(n) { delete n.links; }
		return n;
	}

	/**
	 * Creates the widget to switch between aerial and streets imagery
	 * @private
	 */
	_addMapBackgroundWidget() {
		// Container
		const pnlLayers = document.createElement("div");
		pnlLayers.id = "gvs-map-bg";
		pnlLayers.classList.add("gvs-panel", "gvs-widget-bg", "gvs-input-group");
		const onBgChange = e => this.map.setBackground(e.target.value);

		// Radio streets
		const radioBgStreets = document.createElement("input");
		radioBgStreets.id = "gvs-map-bg-streets";
		radioBgStreets.setAttribute("type", "radio");
		radioBgStreets.setAttribute("name", "gvs-map-bg");
		radioBgStreets.setAttribute("value", "streets");
		radioBgStreets.addEventListener("change", onBgChange);
		pnlLayers.appendChild(radioBgStreets);

		const labelBgStreets = document.createElement("label");
		labelBgStreets.setAttribute("for", radioBgStreets.id);

		const imgBgStreets = document.createElement("img");
		imgBgStreets.src = BackgroundStreets;
		imgBgStreets.alt = "";

		labelBgStreets.appendChild(imgBgStreets);
		labelBgStreets.appendChild(document.createTextNode(this._t.gvs.map_background_streets));
		pnlLayers.appendChild(labelBgStreets);
		
		// Radio aerial
		const radioBgAerial = document.createElement("input");
		radioBgAerial.id = "gvs-map-bg-aerial";
		radioBgAerial.setAttribute("type", "radio");
		radioBgAerial.setAttribute("name", "gvs-map-bg");
		radioBgAerial.setAttribute("value", "aerial");
		radioBgAerial.addEventListener("change", onBgChange);
		pnlLayers.appendChild(radioBgAerial);

		const labelBgAerial = document.createElement("label");
		labelBgAerial.setAttribute("for", radioBgAerial.id);

		const imgBgAerial = document.createElement("img");
		imgBgAerial.src = BackgroundAerial;
		imgBgAerial.alt = "";

		labelBgAerial.appendChild(imgBgAerial);
		labelBgAerial.appendChild(document.createTextNode(this._t.gvs.map_background_aerial));
		pnlLayers.appendChild(labelBgAerial);

		this.mapContainer.appendChild(pnlLayers);

		const onMapBgChange = bg => {
			if(bg === "aerial") { radioBgAerial.checked = true; }
			else { radioBgStreets.checked = true; }
		};
		this.addEventListener("map:background-changed", e => onMapBgChange(e.detail.background));
		onMapBgChange(this.map.getBackground());
	}

	/**
	 * Preview on map how the new relative heading would reflect on all pictures.
	 * This doesn't change anything on API-side, it's just a preview.
	 * 
	 * @param {number} [relHeading] The new relative heading compared to sequence path. In degrees, between -180 and 180 (0 = front, -90 = left, 90 = right). Set to null to remove preview.
	 */
	previewSequenceHeadingChange(relHeading) {
		const layerExists = this.map.getLayer(LAYER_HEADING_ID) !== undefined;
		this.map._picMarkerPreview.remove();

		// If no value set, remove layer
		if(relHeading === undefined) {
			delete this._lastRelHeading;
			if(layerExists) {
				this.map.setLayoutProperty(LAYER_HEADING_ID, "visibility", "none");
			}
			// Update selected picture marker
			if(this._selectedPicId) {
				this.map._picMarker.setRotation(this.psv.getXY().x);
			}
			return;
		}

		this._lastRelHeading = relHeading;

		// Create preview layer
		if(!layerExists) {
			this.map.addLayer({
				"id": LAYER_HEADING_ID,
				"type": "symbol",
				"source": "geovisio_editor_sequences",
				"layout": {
					"icon-image": "gvs-marker",
					"icon-overlap": "always",
					"icon-size": 0.8,
				},
			});
		}

		// Change heading
		const currentRelHeading = - this.psv.getPictureRelativeHeading();
		this.map.setLayoutProperty(LAYER_HEADING_ID, "visibility", "visible");
		this.map.setLayoutProperty(
			LAYER_HEADING_ID,
			"icon-rotate",
			["+", ["get", "view:azimuth"], currentRelHeading, relHeading ]
		);

		// Skip selected picture and linestring geom
		const filters = [["==", ["geometry-type"], "Point"]];
		if(this._selectedPicId) { filters.push(["!=", ["get", "id"], this._selectedPicId]); }
		this.map.setFilter(LAYER_HEADING_ID, ["all", ...filters]);

		// Update selected picture marker
		if(this._selectedPicId) {
			this.map._picMarker.setRotation(this.psv.getXY().x);
		}
	}

	/**
	 * Event handler for picture loading
	 * @private
	 */
	_onSelect() {
		// Update preview of heading change
		if(this._lastRelHeading !== undefined) {
			this.previewSequenceHeadingChange(this._lastRelHeading);
		}
	}
}
