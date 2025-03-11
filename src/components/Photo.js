import "./Photo.css";
import LoaderImgBase from "../img/loader_base.jpg";
import LogoDead from "../img/logo_dead.svg";
import {
	getDistance, positionToXYZ, xyzToPosition,
	apiFeatureToPSVNode, getRelativeHeading, BASE_PANORAMA_ID,
} from "../utils/Utils";

// Photo Sphere Viewer imports
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import "@photo-sphere-viewer/gallery-plugin/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import { Viewer as PSViewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import PhotoAdapter from "../utils/PhotoAdapter";


// Default panorama (logo)
const BASE_PANORAMA = {
	baseUrl: LoaderImgBase,
	width: 1280,
	cols: 2,
	rows: 1,
	tileUrl: () => null,
};
const BASE_PANORAMA_NODE = {
	id: BASE_PANORAMA_ID,
	caption: "",
	panorama: BASE_PANORAMA,
	links: [],
	gps: [0,0],
	sequence: {},
	sphereCorrection: {},
	horizontalFov: 360,
	properties: {},
};

export const PSV_DEFAULT_ZOOM = 30;
export const PSV_ANIM_DURATION = 250;
export const PIC_MAX_STAY_DURATION = 3000;

PSViewer.useNewAnglesOrder = true;

/**
 * Photo is the component showing a single picture.
 * It uses Photo Sphere Viewer as a basis, and pre-configure dialog with STAC API.
 * 
 * Note that all functions of [PhotoSphereViewer Viewer class](https://photo-sphere-viewer.js.org/api/classes/core.viewer) are available as well.
 * 
 * @param {CoreView} parent The parent view
 * @param {Element} container The DOM element to create into
 * @param {object} [options] The viewer options. Can be any of [Photo Sphere Viewer options](https://photo-sphere-viewer.js.org/guide/config.html#standard-options)
 * @param {number} [options.transitionDuration] The number of milliseconds the transition animation should be.
 * @param {function} [options.shouldGoFast] Function returning a boolean to indicate if we may skip loading HD images.
 */
export default class Photo extends PSViewer {
	constructor(parent, container, options = {}) {
		super({
			container,
			adapter: [PhotoAdapter, {
				showErrorTile: false,
				baseBlur: false,
				resolution: parent.isWidthSmall() ? 32 : 64,
				shouldGoFast: options.shouldGoFast,
			}],
			withCredentials: parent._options?.fetchOptions?.credentials == "include",
			requestHeaders: parent._options?.fetchOptions?.headers,
			panorama: BASE_PANORAMA,
			lang: parent._t.psv,
			minFov: 5,
			loadingTxt: "&nbsp;",
			navbar:	null,
			rendererParameters: {
				preserveDrawingBuffer: !parent.isWidthSmall(),
			},
			plugins: [
				[VirtualTourPlugin, {
					dataMode: "server",
					positionMode: "gps",
					renderMode: "3d",
					preload: true,
					getNode: () => {},
					transitionOptions: () => {},
					arrowsPosition: {
						linkOverlapAngle: Math.PI / 6,
					}
				}],
			],
			...options
		});

		this._parent = parent;
		container.classList.add("gvs-psv");
		this._shouldGoFast = options?.shouldGoFast || (() => false);
		this._transitionDuration = options?.transitionDuration || PSV_ANIM_DURATION;
		this._myVTour = this.getPlugin(VirtualTourPlugin);
		this._myVTour.datasource.nodeResolver = this._getNodeFromAPI.bind(this);
		this._myVTour.config.transitionOptions = this._psvNodeTransition.bind(this);
		this._clearArrows = this._myVTour.arrowsRenderer.clear.bind(this._myVTour.arrowsRenderer);
		this._myVTour.arrowsRenderer.clear = () => {};

		// Cache to find sequence ID for a single picture
		this._picturesSequences = {};

		// Offer various custom events
		this._myVTour.addEventListener("enter-arrow", this._onEnterArrow.bind(this));
		this._myVTour.addEventListener("leave-arrow", this._onLeaveArrow.bind(this));
		this._myVTour.addEventListener("node-changed", this._onNodeChanged.bind(this));
		this.addEventListener("position-updated", this._onPositionUpdated.bind(this));
		this.addEventListener("zoom-updated", this._onZoomUpdated.bind(this));
		this._parent.addEventListener("select", this._onSelect.bind(this));

		// Fix for loader circle background not showing up
		this.loader.size = 150;
		this.loader.color = "rgba(61, 61, 61, 0.5)";
		this.loader.textColor = "rgba(255, 255, 255, 0.7)";
		this.loader.border = 5;
		this.loader.thickness = 10;
		this.loader.canvas.setAttribute("viewBox", "0 0 150 150");
		this.loader.__updateContent();
	}

	/**
	 * Calls API to retrieve a certain picture, then transforms into PSV format
	 *
	 * @private
	 * @param {string} picId The picture UUID
	 * @returns {Promise} Resolves on PSV node metadata
	 */
	async _getNodeFromAPI(picId) {
		if(!picId || picId === BASE_PANORAMA_ID) { return BASE_PANORAMA_NODE; }

		const picApiResponse = await fetch(
			this._parent._api.getPictureMetadataUrl(picId, this._picturesSequences[picId]),
			this._parent._api._getFetchOptions()
		);
		let metadata = await picApiResponse.json();

		if(metadata.features) { metadata = metadata.features.pop(); }
		if(!metadata || Object.keys(metadata).length === 0 || !picApiResponse.ok) {
			if(this._parent._loader) {
				this._parent._loader.dismiss(true, this._parent._t.gvs.error_pic);
			}
			throw new Error("Picture with ID " + picId + " was not found");
		}

		this._picturesSequences[picId] = metadata.collection;
		const node = apiFeatureToPSVNode(
			metadata,
			this._parent._t,
			this._parent._isInternetFast,
			this._parent._picturesNavFilter?.bind(this._parent)
		);
		if(node?.sequence?.prevPic) { this._picturesSequences[node?.sequence?.prevPic] = metadata.collection; }
		if(node?.sequence?.nextPic) { this._picturesSequences[node?.sequence?.nextPic] = metadata.collection; }

		return node;
	}

	/**
	 * PSV node transition handler
	 * @param {*} toNode Next loading node
	 * @param {*} [fromNode] Currently shown node (previous)
	 * @param {*} [fromLink] Link clicked by user to go from current to next node
	 * @private
	 */
	_psvNodeTransition(toNode, fromNode, fromLink) {
		let nodeTransition = {};

		const animationDuration = this._shouldGoFast() ? 0 : Math.min(PSV_ANIM_DURATION, this._transitionDuration);
		const animated = animationDuration > 100;
		const following = (fromLink || fromNode?.links.find(a => a.nodeId == toNode.id)) != null;
		const sameSequence = fromNode && toNode.sequence.id === fromNode.sequence.id;
		const fromNodeHeading = (fromNode?.properties?.["view:azimuth"] || 0) * (Math.PI / 180);
		const toNodeHeading = (toNode?.properties?.["view:azimuth"] || 0) * (Math.PI / 180);

		this.setOption("maxFov", Math.min(toNode.horizontalFov * 3/4, 90));

		const centerNoAnim = {
			speed: 0,
			fadeIn: false,
			rotation: false,
			rotateTo: { pitch: 0, yaw: 0 },
			zoomTo: PSV_DEFAULT_ZOOM
		};

		// Going to 360
		if(toNode.horizontalFov == 360) {
			// No previous sequence -> Point to center + no animation
			if(!fromNode) {
				nodeTransition = centerNoAnim;
			}
			// Has a previous sequence
			else {
				// Far away sequences -> Point to center + no animation
				if(getDistance(fromNode.gps, toNode.gps) >= 0.001) {
					nodeTransition = centerNoAnim;
				}
				// Nearby sequences -> Keep orientation
				else {
					nodeTransition = {
						speed: animationDuration,
						fadeIn: following && animated,
						rotation: following && sameSequence && animated,
						rotateTo: this.getPosition()
					};
					// Constant direction related to North
					// nodeTransition.rotateTo.yaw += fromNodeHeading - toNodeHeading;
				}
			}
		}
		// Going to flat
		else {
			// Same sequence -> Point to center + animation if following pics + not vomiting
			if(sameSequence) {
				const fromYaw = this.getPosition().yaw;
				const fovMaxYaw = (fromNode.horizontalFov * (Math.PI / 180)) / 2;
				const keepZoomPos = fromYaw <= fovMaxYaw || fromYaw >= (2 * Math.PI - fovMaxYaw);
				const notTooMuchRotation = Math.abs(fromNodeHeading - toNodeHeading) <= Math.PI / 4;
				nodeTransition = {
					speed: animationDuration,
					fadeIn: following && notTooMuchRotation && animated,
					rotation: following && notTooMuchRotation && animated,
					rotateTo: keepZoomPos ? this.getPosition() : { pitch: 0, yaw: 0 },
					zoomTo: keepZoomPos ? this.getZoomLevel() :  PSV_DEFAULT_ZOOM,
				};
			}
			// Different sequence -> Point to center + no animation
			else {
				nodeTransition = centerNoAnim;
			}
		}

		if(nodeTransition.fadeIn && nodeTransition.speed >= 150) {
			setTimeout(this._clearArrows, nodeTransition.speed-100);
		}
		else {
			this._clearArrows();
		}


		/**
		 * Event for picture starting to load
		 *
		 * @event psv:picture-loading
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} detail.picId The picture unique identifier
		 * @property {number} detail.lon Longitude (WGS84)
		 * @property {number} detail.lat Latitude (WGS84)
		 * @property {number} detail.x New x position (in degrees, 0-360), corresponds to heading (0° = North, 90° = East, 180° = South, 270° = West)
		 * @property {number} detail.y New y position (in degrees)
		 * @property {number} detail.z New z position (0-100)
		 */
		const event = new CustomEvent("psv:picture-loading", {
			detail: {
				...Object.assign({},
					this.getXYZ(),
					nodeTransition.rotateTo ? { x: (toNodeHeading + nodeTransition.rotateTo.yaw) * 180 / Math.PI } : null,
					nodeTransition.zoomTo ? { z: nodeTransition.zoomTo } : null
				),
				picId: toNode.id,
				lon: toNode.gps[0],
				lat: toNode.gps[1]
			}
		});
		this._parent.dispatchEvent(event);

		return nodeTransition;
	}

	/**
	 * Event handler for PSV arrow hover.
	 * It creates a custom event "picture-preview-started"
	 * @private
	 * @param {object} e The event data
	 */
	_onEnterArrow(e) {
		const fromLink = e.link;
		const fromNode = e.node;

		// Find probable direction for previewed picture
		let direction;
		if(fromNode) {
			if(fromNode.horizontalFov === 360) {
				direction = (this.getPictureOriginalHeading() + this.getPosition().yaw * 180 / Math.PI) % 360;
			}
			else {
				direction = this.getPictureOriginalHeading();
			}
		}
		
		/**
		 * Event for picture preview
		 *
		 * @event psv:picture-preview-started
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} detail.picId The picture ID
		 * @property {number[]} detail.coordinates [x,y] coordinates
		 * @property {number} detail.direction The theorical picture orientation
		 */
		const event = new CustomEvent("psv:picture-preview-started", { detail: {
			picId: fromLink.nodeId,
			coordinates: fromLink.gps,
			direction,
		}});
		this._parent.dispatchEvent(event);
	}

	/**
	 * Event handler for PSV arrow end of hovering.
	 * It creates a custom event "picture-preview-stopped"
	 * @private
	 * @param {object} e The event data
	 */
	_onLeaveArrow(e) {
		const fromLink = e.link;
		
		/**
		 * Event for end of picture preview
		 *
		 * @event psv:picture-preview-stopped
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} detail.picId The picture ID
		 */
		const event = new CustomEvent("psv:picture-preview-stopped", { detail: {
			picId: fromLink.nodeId,
		}});
		this._parent.dispatchEvent(event);
	}

	/**
	 * Event handler for position update in PSV.
	 * Allows to send a custom "view-rotated" event.
	 * @private
	 */
	_onPositionUpdated({position}) {
		const pos = positionToXYZ(position, this.getZoomLevel());
		pos.x += this.getPictureOriginalHeading();
		pos.x = pos.x % 360;
		/**
		 * Event for viewer rotation
		 *
		 * @event psv:view-rotated
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {number} detail.x New x position (in degrees, 0-360), corresponds to heading (0° = North, 90° = East, 180° = South, 270° = West)
		 * @property {number} detail.y New y position (in degrees)
		 * @property {number} detail.z New Z position (between 0 and 100)
		 */
		const event = new CustomEvent("psv:view-rotated", { detail: pos });
		this._parent.dispatchEvent(event);

		this._onTilesStartLoading();
	}

	/**
	 * Event handler for zoom updates in PSV.
	 * Allows to send a custom "view-rotated" event.
	 * @private
	 */
	_onZoomUpdated({zoomLevel}) {
		const event = new CustomEvent("psv:view-rotated", { detail: { ...this.getXY(), z: zoomLevel} });
		this._parent.dispatchEvent(event);

		this._onTilesStartLoading();
	}

	/**
	 * Event handler for node change in PSV.
	 * Allows to send a custom "psv:picture-loaded" event.
	 * @private
	 */
	_onNodeChanged(e) {
		// Clean up clicked arrows
		for(let d of document.getElementsByClassName("gvs-psv-tour-arrows")) {
			d.classList.remove("gvs-clicked");
		}
		
		if(e.node.id) {
			this._parent.select(e.node?.sequence?.id, e.node.id);
			const picMeta = this.getPictureMetadata();
			if(!picMeta) {
				this._parent.dispatchEvent(new CustomEvent("psv:picture-loaded", {detail: {}}));
				return;
			}
			this._prevSequence = picMeta.sequence.id;

			/**
			 * Event for picture load (low-resolution image is loaded)
			 *
			 * @event psv:picture-loaded
			 * @memberof CoreView
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} detail.picId The picture unique identifier
			 * @property {number} detail.lon Longitude (WGS84)
			 * @property {number} detail.lat Latitude (WGS84)
			 * @property {number} detail.x New x position (in degrees, 0-360), corresponds to heading (0° = North, 90° = East, 180° = South, 270° = West)
			 * @property {number} detail.y New y position (in degrees)
			 * @property {number} detail.z New z position (0-100)
			 */
			const event = new CustomEvent("psv:picture-loaded", {
				detail: {
					...this.getXYZ(),
					picId: e.node.id,
					lon: picMeta.gps[0],
					lat: picMeta.gps[1]
				}
			});
			this._parent.dispatchEvent(event);

			// Change download URL
			if(picMeta.panorama.hdUrl) {
				this.setOption("downloadUrl", picMeta.panorama.hdUrl);
				this.setOption("downloadName", e.node.id+".jpg");
			}
			else {
				this.setOption("downloadUrl", null);
			}
		}

		this._onTilesStartLoading();
	}

	/**
	 * Event handler for loading a new range of tiles
	 *
	 * @private
	 */
	_onTilesStartLoading() {
		if(this._tilesQueueTimer) {
			clearInterval(this._tilesQueueTimer);
			delete this._tilesQueueTimer;
		}
		this._tilesQueueTimer = setInterval(() => {
			if(Object.keys(this.adapter.queue.tasks).length === 0) {
				if(this._myVTour.state.currentNode) {
					/**
					 * Event launched when all visible tiles of a picture are loaded
					 *
					 * @event psv:picture-tiles-loaded
					 * @memberof CoreView
					 * @type {object}
					 * @property {object} detail Event information
					 * @property {string} detail.picId The picture unique identifier
					 */
					const event = new Event("psv:picture-tiles-loaded", { picId: this._myVTour.state.currentNode.id });
					this._parent.dispatchEvent(event);
				}
				clearInterval(this._tilesQueueTimer);
				delete this._tilesQueueTimer;
			}
		}, 100);
	}

	/**
	 * Access currently shown picture metadata
	 *
	 * @returns {object} Picture metadata
	 */
	getPictureMetadata() {
		if(this._myVTour?.state?.currentNode?.id === BASE_PANORAMA_ID) { return null; }
		return this._myVTour.state.currentNode ? Object.assign({}, this._myVTour.state.currentNode) : null;
	}

	/**
	 * Handler for select event.
	 * @private
	 */
	_onSelect(e) {
		if(e.detail.seqId) {
			this._picturesSequences[e.detail.picId] = e.detail.seqId;
		}

		if(this._myVTour.getCurrentNode()?.id !== e.detail.picId) {
			this.loader.show();
			this._myVTour.setCurrentNode(e.detail.picId).catch(e => {
				this.showErrorOverlay(e, this._parent._t.gvs.error_pic, true);
			});
		}
	}

	/**
	 * Displays next picture in current sequence (if any)
	 */
	goToNextPicture() {
		if(!this.getPictureMetadata()) {
			throw new Error("No picture currently selected");
		}

		const next = this.getPictureMetadata().sequence.nextPic;
		if(next) {
			this._parent.select(this.getPictureMetadata().sequence.id, next);
		}
		else {
			throw new Error("No next picture available");
		}
	}

	/**
	 * Displays previous picture in current sequence (if any)
	 */
	goToPrevPicture() {
		if(!this.getPictureMetadata()) {
			throw new Error("No picture currently selected");
		}

		const prev = this.getPictureMetadata().sequence.prevPic;
		if(prev) {
			this._parent.select(this.getPictureMetadata().sequence.id, prev);
		}
		else {
			throw new Error("No previous picture available");
		}
	}

	/**
	 * Displays in viewer a picture near to given coordinates
	 *
	 * @param {number} lat Latitude (WGS84)
	 * @param {number} lon Longitude (WGS84)
	 * @returns {Promise} Resolves on picture ID if picture found, otherwise rejects
	 */
	async goToPosition(lat, lon) {
		return this._parent._api.getPicturesAroundCoordinates(lat, lon)
			.then(res => {
				if(res.features.length > 0) {
					const f = res.features.pop();
					this._parent.select(
						f?.collection,
						f.id
					);
					return f.id;
				}
				else {
					return Promise.reject(new Error("No picture found nearby given coordinates"));
				}
			});
	}

	/**
	 * Get 2D position of sphere currently shown to user
	 *
	 * @returns {object} Position in format { x: heading in degrees (0° = North, 90° = East, 180° = South, 270° = West), y: top/bottom position in degrees (-90° = bottom, 0° = front, 90° = top) }
	 */
	getXY() {
		const pos = positionToXYZ(this.getPosition());
		pos.x = (pos.x + this.getPictureOriginalHeading()) % 360;
		return pos;
	}

	/**
	 * Get 3D position of sphere currently shown to user
	 *
	 * @returns {object} Position in format { x: heading in degrees (0° = North, 90° = East, 180° = South, 270° = West), y: top/bottom position in degrees (-90° = bottom, 0° = front, 90° = top), z: zoom (0 = wide, 100 = zoomed in) }
	 */
	getXYZ() {
		const pos = this.getXY();
		pos.z = this.getZoomLevel();
		return pos;
	}

	/**
	 * Get capture orientation of current picture, based on its GPS.
	 * @returns Picture original heading in degrees (0 to 360°)
	 */
	getPictureOriginalHeading() {
		return this.getPictureMetadata()?.properties?.["view:azimuth"] || 0;
	}

	/**
	 * Computes the relative heading of currently selected picture.
	 * This gives the angle of capture compared to sequence path (vehicle movement).
	 * 
	 * @returns Relative heading in degrees (-180 to 180)
	 */
	getPictureRelativeHeading() {
		return getRelativeHeading(this.getPictureMetadata());
	}

	/**
	 * Clears the Photo Sphere Viewer metadata cache.
	 * It is useful when current picture or sequence has changed server-side after first load.
	 */
	clearPictureMetadataCache() {
		const oldPicId = this.getPictureMetadata()?.id;
		const oldSeqId = this.getPictureMetadata()?.sequence?.id;

		// Force deletion of cached metadata in PSV
		this._myVTour.state.currentTooltip?.hide();
		this._myVTour.state.currentTooltip = null;
		this._myVTour.state.currentNode = null;
		this._myVTour.state.preload = {};
		this._myVTour.datasource.nodes = {};

		// Reload current picture if one was selected
		if(oldPicId) {
			this._parent.select(oldSeqId, oldPicId);
		}
	}

	/**
	 * Change the shown position in picture
	 *
	 * @param {number} x X position (in degrees)
	 * @param {number} y Y position (in degrees)
	 * @param {number} z Z position (0-100)
	 */
	setXYZ(x, y, z) {
		const coords = xyzToPosition(x - this.getPictureOriginalHeading(), y, z);
		this.rotate({ yaw: coords.yaw, pitch: coords.pitch });
		this.zoom(coords.zoom);
	}

	/**
	 * Enable or disable higher contrast on picture
	 * @param {boolean} enable True to enable higher contrast
	 */
	setHigherContrast(enable) {
		this.renderer.renderer.toneMapping = enable ? 3 : 0;
		this.renderer.renderer.toneMappingExposure = enable ? 2 : 1;
		this.needsUpdate();
	}

	/**
	 * Get the duration of stay on a picture during a sequence play.
	 * @returns {number} The duration (in milliseconds)
	 */
	getTransitionDuration() {
		return this._transitionDuration;
	}

	/**
	 * Changes the duration of stay on a picture during a sequence play.
	 * 
	 * @param {number} value The new duration (in milliseconds, between 100 and 3000)
	 */
	setTransitionDuration(value) {
		value = parseFloat(value);
		if(value < 100 || value > PIC_MAX_STAY_DURATION) {
			throw new Error("Invalid transition duration (should be between 100 and "+PIC_MAX_STAY_DURATION+")");
		}
		this._transitionDuration = value;

		/**
		 * Event for transition duration change
		 *
		 * @event psv:transition-duration-changed
		 * @memberof CoreView
		 * @type {object}
		 * @property {object} detail Event information
		 * @property {string} detail.duration New duration (in milliseconds)
		 */
		const event = new CustomEvent("psv:transition-duration-changed", { detail: { value } });
		this._parent.dispatchEvent(event);
	}

	setPanorama(path, options) {
		const onFailure = e => this.showErrorOverlay(e, this._parent._t.gvs.error_pic, true);
		try {
			return super.setPanorama(path, options).catch(onFailure);
		}
		catch(e) {
			onFailure(e);
		}
	}

	/**
	 * Display an error message to user on screen
	 * @param {object} e The initial error
	 * @param {str} label The main error label to display
	 * @param {boolean} dissmisable Is error dissmisable
	 */
	showErrorOverlay(e, label, dissmisable) {
		if(this._parent._loader.isVisible() || !this.overlay.isVisible()) {
			this._parent._loader.dismiss(
				e,
				label,
				dissmisable ? () => {
					this._parent._loader.dismiss();
					this.overlay.hide();
				} : undefined
			);
		}
		else {
			console.error(e);
			this.overlay.show({
				image: `<img style="width: 200px" src="${LogoDead}" alt="" />`,
				title: this._parent._t.gvs.error, 
				text: label + "<br />" + this._parent._t.gvs.error_click,
				dissmisable,
			});
		}
	}
}
