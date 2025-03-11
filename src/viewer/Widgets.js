import "./Widgets.css";
import { PSV_ANIM_DURATION, PSV_ZOOM_DELTA, PIC_MAX_STAY_DURATION } from "../Viewer";
import {
	createPanel, createGroup, fa, fat, createButton, disableButton,
	createSearchBar, createExpandableButton, enableButton, enableCopyButton, closeOtherPanels,
	createLinkCell, createTable, createHeader, createButtonSpan, createLabel, showGrade,
	showQualityScore,
} from "../utils/Widgets";
import { COLORS, isInIframe, getUserAccount, QUALITYSCORE_VALUES, getGrade, QUALITYSCORE_GPS_VALUES, QUALITYSCORE_RES_360_VALUES, QUALITYSCORE_RES_FLAT_VALUES, QUALITYSCORE_POND_RES, QUALITYSCORE_POND_GPS } from "../utils/Utils";
import SwitchBig from "../img/switch_big.svg";
import SwitchMini from "../img/switch_mini.svg";
import BackgroundAerial from "../img/bg_aerial.jpg";
import BackgroundStreets from "../img/bg_streets.jpg";
import { getGPSPrecision } from "../utils/Exif";

// Every single icon imported separately to reduce bundle size
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faMinus } from "@fortawesome/free-solid-svg-icons/faMinus";
import { faShareNodes } from "@fortawesome/free-solid-svg-icons/faShareNodes";
import { faLink } from "@fortawesome/free-solid-svg-icons/faLink";
import { faMap } from "@fortawesome/free-solid-svg-icons/faMap";
import { faImage } from "@fortawesome/free-solid-svg-icons/faImage";
import { faPanorama } from "@fortawesome/free-solid-svg-icons/faPanorama";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { faBackward } from "@fortawesome/free-solid-svg-icons/faBackward";
import { faForward } from "@fortawesome/free-solid-svg-icons/faForward";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { faCalendar } from "@fortawesome/free-solid-svg-icons/faCalendar";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faCamera } from "@fortawesome/free-solid-svg-icons/faCamera";
import { faPen } from "@fortawesome/free-solid-svg-icons/faPen";
import { faPrint } from "@fortawesome/free-solid-svg-icons/faPrint";
import { faSatelliteDish } from "@fortawesome/free-solid-svg-icons/faSatelliteDish";
import { faEllipsisVertical } from "@fortawesome/free-solid-svg-icons/faEllipsisVertical";
import { faRocket } from "@fortawesome/free-solid-svg-icons/faRocket";
import { faPalette } from "@fortawesome/free-solid-svg-icons/faPalette";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons/faLightbulb";
import { faPersonBiking } from "@fortawesome/free-solid-svg-icons/faPersonBiking";
import { faSliders } from "@fortawesome/free-solid-svg-icons/faSliders";
import { faLayerGroup } from "@fortawesome/free-solid-svg-icons/faLayerGroup";
import { faEarthEurope } from "@fortawesome/free-solid-svg-icons/faEarthEurope";
import { faUser } from "@fortawesome/free-solid-svg-icons/faUser";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons/faCircleInfo";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faLocationDot } from "@fortawesome/free-solid-svg-icons/faLocationDot";
import { faSquareRss } from "@fortawesome/free-solid-svg-icons/faSquareRss";
import { faCloudArrowDown } from "@fortawesome/free-solid-svg-icons/faCloudArrowDown";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons/faTriangleExclamation";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons/faCircleQuestion";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons/faCommentDots";
import { faAt } from "@fortawesome/free-solid-svg-icons/faAt";
import { faPaperPlane } from "@fortawesome/free-solid-svg-icons/faPaperPlane";
import { faMedal } from "@fortawesome/free-solid-svg-icons/faMedal";
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons/faInfoCircle";


/**
 * Handles all map/viewer buttons visible on UI.
 * Also handles switch between map and viewer, and responsiveness.
 * 
 * @private
 */
export default class Widgets {
	/**
	 * @param {Viewer} viewer The viewer
	 * @param {object} [options] Widgets options
	 * @param {string} [options.editIdUrl] Edit with iD URL
	 * @param {string} [options.mapAttribution] Override default map attribution
	 * @param {string|Element} [options.customWidget] A user-defined widget to add
	 * @param {string} [options.iframeBaseURL] Set a custom base URL for the "Share as iframe" menu (defaults to current page)
	 */
	constructor(viewer, options = {}) {
		// Set default options
		if(options == null) { options = {}; }
		if(options.editIdUrl == null) { options.editIdUrl = "https://www.openstreetmap.org/edit"; }
		
		this._viewer = viewer;
		this._t = this._viewer._t;
		this._options = options;
		const hasMap = this._viewer.map !== undefined;

		// Create widgets "corners"
		this._corners = {};
		const components = hasMap ? ["main", "mini"] : ["main"];
		const cornerSpace = ["top", "bottom"];
		const corners = ["left", "middle", "right"];
		for(let cp of components) {
			for(let cs of cornerSpace) {
				const csDom = document.createElement("div");
				csDom.id = `gvs-corner-${cp}-${cs}`;
				csDom.classList.add("gvs-corner-space");

				for(let cn of corners) {
					const corner = document.createElement("div");
					corner.id = `${csDom.id}-${cn}`;
					corner.classList.add("gvs-corner");
					this._corners[`${cp}-${cs}-${cn}`] = corner;
					csDom.appendChild(corner);
				}

				if(cp == "main") { this._viewer.mainContainer.appendChild(csDom); }
				else if(cp == "mini") { this._viewer.miniContainer.appendChild(csDom); }
			}
		}

		if(!isInIframe()) {
			this._initWidgetPlayer(hasMap);
		}
		this._initWidgetLegend(hasMap, options?.mapAttribution);

		if(hasMap) {
			this._initWidgetMiniActions();
			if(!isInIframe()) {
				this._initWidgetSearch();
				this._initWidgetFilters(
					this._viewer._api._endpoints.user_search !== null
					&& this._viewer._api._endpoints.user_tiles !== null,
					this._viewer.map && this._viewer.map._hasQualityScore()
				);
				this._initWidgetMapLayers();
				this._listenMapFiltersChanges();
			}
		}

		if(!this._viewer.isWidthSmall()) {
			this._initWidgetShare();
		}

		// Custom widget provided by user
		if(options.customWidget) {
			const corner = this._corners["main-bottom-right"];

			switch(typeof options.customWidget) {
			case "string":
				for(let e of new DOMParser().parseFromString(options.customWidget, "text/html").body.children) {
					corner.appendChild(e);
				}
				break;
			
			case "object":
				if(Array.isArray(options.customWidget)) {
					options.customWidget.forEach(e => corner.appendChild(e));
				}
				else {
					corner.appendChild(options.customWidget);
				}
				break;
			}
		}

		this._initWidgetZoom(hasMap);

		// Click outside of an open panel -> closes panels
		this._viewer.container.addEventListener("click", e => closeOtherPanels(e.target, this._viewer.container));
	}

	/**
	 * Ends all form of life in this object.
	 */
	destroy() {
		Object.values(this._corners).forEach(e => e.remove());
		delete this._corners;
		delete this._t;
		delete this._viewer;
	}

	/**
	 * Creates the zoom buttons group
	 * @param {boolean} hasMap True if map is enabled
	 * @private
	 */
	_initWidgetZoom(hasMap) {
		this._lastWantedZoom = this._viewer.psv.getZoomLevel();

		// Presentation
		const btnZoomIn = createButton("gvs-zoom-in", fa(faPlus), this._t.gvs.zoomIn);
		const btnZoomOut = createButton("gvs-zoom-out", fa(faMinus), this._t.gvs.zoomOut);
		createGroup("gvs-widget-zoom", "main-bottom-right", this, [btnZoomIn, btnZoomOut], ["gvs-group-vertical", "gvs-mobile-hidden", "gvs-print-hidden"]);

		// Events
		const zoomFct = (e, zoomIn) => {
			if(hasMap && this._viewer.isMapWide()) {
				if(zoomIn) { this._viewer.map.zoomIn({}, {originalEvent: e}); }
				else { this._viewer.map.zoomOut({}, {originalEvent: e}); }
			}
			else {
				if(this._viewer.lastPsvAnim) { this._viewer.lastPsvAnim.cancel(); }
				const goToZoom = zoomIn ?
					Math.min(100, this._lastWantedZoom + PSV_ZOOM_DELTA)
					: Math.max(0, this._lastWantedZoom - PSV_ZOOM_DELTA);
				this._viewer.lastPsvAnim = this._viewer.psv.animate({
					speed: PSV_ANIM_DURATION,
					zoom: goToZoom
				});
				this._lastWantedZoom = goToZoom;
			}
		};

		btnZoomIn.addEventListener("click", e => zoomFct(e, true));
		btnZoomOut.addEventListener("click", e => zoomFct(e, false));
	}

	/**
	 * Creates play/pause/next/prev picture buttons
	 * @param {boolean} hasMap True if map is enabled
	 * @private
	 */
	_initWidgetPlayer(hasMap) {
		// Presentation
		const btnPlayerPrev = createButton("gvs-player-prev", fa(faBackward), this._t.gvs.sequence_prev);
		const btnPlayerPlay = createButton("gvs-player-play");
		const btnPlayerNext = createButton("gvs-player-next", fa(faForward), this._t.gvs.sequence_next);
		const btnPlayerMore = createButton("gvs-player-more", fa(faEllipsisVertical), this._t.gvs.sequence_more, ["gvs-xs-hidden"]);

		// Panel for more options
		const pnlOpts = createPanel(this, btnPlayerMore, [], ["gvs-player-options"]);
		pnlOpts.innerHTML = `
			<div class="gvs-input-range" title="${this._t.gvs.sequence_speed}">
				${fat(faPersonBiking)}
				<input
					id="gvs-player-speed"
					type="range" name="speed"
					min="0" max="${PIC_MAX_STAY_DURATION - 100}"
					value="${PIC_MAX_STAY_DURATION - this._viewer.psv.getTransitionDuration()}"
					title="${this._t.gvs.sequence_speed}"
					style="width: 100%;" />
				${fat(faRocket)}
			</div>
			<button title="${this._t.gvs.contrast}" id="gvs-player-contrast">
				${fat(faLightbulb)}
			</button>
		`;

		// Group widget
		const grpPlayer = createGroup(
			"gvs-widget-player",
			!hasMap ? "main-top-left" : "main-top-middle",
			this,
			[btnPlayerPrev, btnPlayerPlay, btnPlayerNext].concat(this._viewer.isWidthSmall() ? [] : [pnlOpts, btnPlayerMore]),
			["gvs-group-horizontal", "gvs-only-psv", "gvs-print-hidden", this._viewer.psv.getPictureMetadata() ? "" : "gvs-hidden"]
		);

		// Toggle state of play button
		const toggleBtnPlay = (isPlaying) => {
			btnPlayerPlay.innerHTML = isPlaying ? fat(faPause) : fat(faPlay);
			btnPlayerPlay.title = isPlaying ? this._t.gvs.sequence_pause : this._t.gvs.sequence_play;
		};
		toggleBtnPlay(false);

		// Update state of play button on picture load
		const updatePlayBtn = () => {
			if(this._viewer.getPicturesNavigation() === "pic") {
				disableButton(btnPlayerNext);
				disableButton(btnPlayerPlay);
				disableButton(btnPlayerPrev);
			}
			else {
				if(this._viewer.psv.getPictureMetadata()?.sequence?.prevPic != null) { enableButton(btnPlayerPrev); }
				else { disableButton(btnPlayerPrev); }

				if(this._viewer.psv.getPictureMetadata()?.sequence?.nextPic != null) {
					enableButton(btnPlayerNext);
					enableButton(btnPlayerPlay);
				}
				else {
					disableButton(btnPlayerNext);
					disableButton(btnPlayerPlay);
				}
			}
		};
		updatePlayBtn();
		
		// Listening to viewer events
		this._viewer.addEventListener("sequence-playing", () => toggleBtnPlay(true));
		this._viewer.addEventListener("sequence-stopped", () => toggleBtnPlay(false));
		this._viewer.addEventListener("psv:picture-loaded", () => grpPlayer.classList.remove("gvs-hidden"), { once: true });
		this._viewer.addEventListener("psv:picture-loaded", updatePlayBtn);
		this._viewer.addEventListener("pictures-navigation-changed", updatePlayBtn);

		if(!this._viewer.isWidthSmall()) {
			const btnPlayerSpeed = pnlOpts.children[0].children[1];

			this._viewer.addEventListener("psv:transition-duration-changed", e => {
				btnPlayerSpeed.value = PIC_MAX_STAY_DURATION - e.detail.value;
			});

			btnPlayerSpeed.addEventListener("change", e => {
				const newSpeed = PIC_MAX_STAY_DURATION - e.target.value;
				this._viewer.psv.setTransitionDuration(newSpeed);
			});
		}

		// Buttons events
		btnPlayerPrev.addEventListener("click", () => this._viewer.psv.goToPrevPicture());
		btnPlayerNext.addEventListener("click", () => this._viewer.psv.goToNextPicture());

		btnPlayerPlay.addEventListener("click", () => {
			if(this._viewer.isSequencePlaying()) {
				toggleBtnPlay(false);
				this._viewer.stopSequence();
			}
			else {
				toggleBtnPlay(true);
				this._viewer.playSequence();
			}
		});

		const btnPlayerContrast = document.getElementById("gvs-player-contrast");
		if(btnPlayerContrast) {
			btnPlayerContrast.addEventListener("click", () => {
				if(btnPlayerContrast.classList.contains("gvs-btn-active")) {
					btnPlayerContrast.classList.remove("gvs-btn-active");
					this._viewer.psv.setHigherContrast(false);
				}
				else {
					btnPlayerContrast.classList.add("gvs-btn-active");
					this._viewer.psv.setHigherContrast(true);
				}
			});
		}
	}

	/**
	 * Creates legend block
	 * @param {boolean} hasMap True if map is enabled
	 * @param {string} [mapAttribution] Override map attribution
	 * @private
	 */
	_initWidgetLegend(hasMap, mapAttribution) {
		// Presentation (main widget)
		const mainLegend = createGroup(
			"gvs-widget-legend",
			hasMap ? "main-bottom-right" : "main-bottom-left",
			this,
			[],
			["gvs-widget-bg"]
		);

		// Presentation (mini widget)
		let miniLegend;
		if(hasMap) {
			miniLegend = createGroup(
				"gvs-widget-mini-legend",
				"mini-bottom-right",
				this,
				[],
				["gvs-widget-bg", "gvs-only-mini", "gvs-mobile-hidden"]
			);
		}

		// Show/hide legend button (for small devices)
		let btnVisibLegend, toggleVisibLegend;
		if(this._viewer.isWidthSmall()) {
			btnVisibLegend = document.createElement("button");
			btnVisibLegend.id = "gvs-legend-toggle";
			btnVisibLegend.classList.add("gvs-btn", "gvs-widget-bg", "gvs-print-hidden");
			btnVisibLegend.appendChild(fa(faCircleInfo));
			toggleVisibLegend = () => {
				if(mainLegend.style.visibility === "hidden") {
					mainLegend.style.visibility = "visible";
					if(!hasMap) { toggleLegend(false); }
					else { toggleLegend(this._viewer.isMapWide()); }	
				}
				else {
					mainLegend.innerHTML = "";
					mainLegend.style.visibility = "hidden";
					mainLegend.appendChild(btnVisibLegend);
				}
			};
			btnVisibLegend.addEventListener("click", e => {
				e.stopPropagation();
				toggleVisibLegend();
			});
		}

		const toggleLegend = (focusOnMap) => {
			let mapLegend = mapAttribution || this._viewer.map?._attribution?._attribHTML || "";
			let picLegend = "<a href='https://panoramax.fr/' target='_blank'>Panoramax</a>";

			// Picture legend based on current picture metadata
			const picMeta = this._viewer.psv.getPictureMetadata()?.caption;
			let picMetaBtn;
			if(!isInIframe() && picMeta) {
				picLegend = "";
				if(picMeta.producer) {
					picLegend += `<span style="font-weight: bold">&copy; ${picMeta.producer}</span>`;
				}
				if(picMeta.date) {
					if(picMeta.producer) { picLegend += "&nbsp;-&nbsp;"; }
					picLegend += picMeta.date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
				}

				// Button for metadata popup
				picMetaBtn = fa(faCircleQuestion);
				picMetaBtn.style.marginLeft = "5px";
			}

			// Put appropriate legend according to view focus
			mainLegend.title = "";
			if(focusOnMap) {
				mainLegend.innerHTML = mapLegend;
				if(isInIframe()) {
					mainLegend.innerHTML = "<a href='https://panoramax.fr/' target='_blank'>Panoramax</a><br />" + mainLegend.innerHTML;
				}
				mainLegend.style.cursor = null;
				mainLegend.onclick = null;
				miniLegend.innerHTML = picLegend;
			}
			else {
				mainLegend.innerHTML = picLegend;

				if(picMetaBtn) {
					mainLegend.appendChild(picMetaBtn);
					mainLegend.style.cursor = "pointer";
					mainLegend.title = this._t.gvs.legend_title;
					mainLegend.onclick = isInIframe() ?
						() => window.open(window.location.href, "_blank")
						: this._showPictureMetadataPopup.bind(this);
				}
				else {
					mainLegend.style.cursor = null;
					mainLegend.onclick = null;
				}

				if(hasMap) { miniLegend.innerHTML = mapLegend; }
			}

			if(btnVisibLegend) { mainLegend.appendChild(btnVisibLegend); }
		};

		if(!btnVisibLegend) {
			if(!hasMap) { toggleLegend(false); }
			else { toggleLegend(this._viewer.isMapWide()); }
		}
		else {
			mainLegend.appendChild(btnVisibLegend);
			mainLegend.style.visibility = "hidden";
		}

		// Listening to viewer events
		this._viewer.addEventListener("focus-changed", e => toggleLegend(e.detail.focus == "map"));
		this._viewer.addEventListener("psv:picture-loaded", () => toggleLegend(hasMap && this._viewer.isMapWide()));
	}

	/**
	 * Displays current picture metadata in popup
	 * @private
	 */
	_showPictureMetadataPopup() {
		const picMeta = this._viewer.psv.getPictureMetadata();
		if (!picMeta) { throw new Error("No picture currently selected"); }
	
		const popupContent = [];
		popupContent.push(createHeader("h4", `${fat(faCircleInfo)} ${this._t.gvs.metadata}`));
	
		// Rapid actions (report)
		if (this._viewer._api._endpoints.report) {
			const popupMetaActions = createButtonSpan(`${fat(faTriangleExclamation)} ${this._t.gvs.report}`);
			popupMetaActions.firstChild.addEventListener("click", this._showReportForm.bind(this));
			popupContent.push(popupMetaActions);
		}
	
		// General metadata
		const rowsData = [
			{
				section: this._t.gvs.metadata_general_picid,
				classes: ["gvs-td-with-id"],
				values: createLinkCell(
					picMeta.id,
					this._viewer._api.getPictureMetadataUrl(picMeta.id, picMeta?.sequence?.id),
					this._t.gvs.metadata_general_picid_link,
					this._t.gvs.copy
				)
			},
			{
				section: this._t.gvs.metadata_general_seqid,
				classes: ["gvs-td-with-id"],
				values: createLinkCell(
					picMeta?.sequence?.id,
					this._viewer._api.getSequenceMetadataUrl(picMeta?.sequence?.id),
					this._t.gvs.metadata_general_seqid_link,
					this._t.gvs.copy
				)
			},
			{ section: this._t.gvs.metadata_general_author, value: picMeta?.caption?.producer },
			{ section: this._t.gvs.metadata_general_license, value: picMeta?.caption?.license },
			{
				section: this._t.gvs.metadata_general_date,
				value: picMeta?.caption?.date?.toLocaleDateString(undefined, {
					year: "numeric", month: "long", day: "numeric",
					hour: "numeric", minute: "numeric", second: "numeric",
					fractionalSecondDigits: 3, timeZoneName: "short"
				})
			},
		];
		popupContent.push(createTable("gvs-table-light", rowsData));
	
		// Camera details
		popupContent.push(createHeader("h4", `${fat(faCamera)} ${this._t.gvs.metadata_camera}`));
		const focal = picMeta?.properties?.["pers:interior_orientation"]?.focal_length ? `${picMeta?.properties?.["pers:interior_orientation"]?.focal_length} mm` : "❓";
		let resmp = picMeta?.properties?.["pers:interior_orientation"]?.["sensor_array_dimensions"];
		if(resmp) {
			resmp = `${resmp[0]} x ${resmp[1]} px (${Math.floor(resmp[0] * resmp[1] / 1000000)} Mpx)`;
		}
		let pictype = this._t.gvs.picture_flat;
		let picFov = picMeta?.properties?.["pers:interior_orientation"]?.["field_of_view"]; // Use raw value instead of horizontalFov to avoid default showing up
		if(picFov !== null && picFov !== undefined) {
			if(picFov === 360) { pictype = this._t.gvs.picture_360; }
			else { pictype += ` (${picFov}°)`; }
		}

		const cameraData = [
			{ section: this._t.gvs.metadata_camera_make, value: picMeta?.properties?.["pers:interior_orientation"]?.camera_manufacturer || "❓" },
			{ section: this._t.gvs.metadata_camera_model, value: picMeta?.properties?.["pers:interior_orientation"]?.camera_model || "❓" },
			{ section: this._t.gvs.metadata_camera_type, value: pictype },
			{ section: this._t.gvs.metadata_camera_resolution, value: resmp || "❓" },
			{ section: this._t.gvs.metadata_camera_focal_length, value: focal },
		];
		popupContent.push(createTable("gvs-table-light", cameraData));
	
		// Location details
		popupContent.push(createHeader("h4", `${fat(faLocationDot)} ${this._t.gvs.metadata_location}`));
		const orientation = picMeta?.properties?.["view:azimuth"] !== undefined ? `${picMeta.properties["view:azimuth"]}°` : "❓";
		const gpsPrecisionLabel = getGPSPrecision(picMeta);
		const locationData = [
			{ section: this._t.gvs.metadata_location_longitude, value: picMeta.gps[0] },
			{ section: this._t.gvs.metadata_location_latitude, value: picMeta.gps[1] },
			{ section: this._t.gvs.metadata_location_orientation, value: orientation },
			{ section: this._t.gvs.metadata_location_precision, value: gpsPrecisionLabel },
		];
		popupContent.push(createTable("gvs-table-light", locationData));
	
		// Picture quality level
		if(this._viewer?.map?._hasQualityScore()) {
			const qsHeader = createHeader(
				"h4",
				`${fat(faMedal)} ${this._t.gvs.metadata_quality} <button class="gvs-btn-link" title="${this._t.gvs.metadata_quality_help}">${fat(faInfoCircle)}</button>`
			);
			qsHeader.lastChild.addEventListener("click", () => this._showQualityScoreDoc());
			popupContent.push(qsHeader);
			const gpsGrade = getGrade(QUALITYSCORE_GPS_VALUES, picMeta?.properties?.["quality:horizontal_accuracy"]);
			const resGrade = getGrade(
				picMeta?.horizontalFov === 360 ? QUALITYSCORE_RES_360_VALUES : QUALITYSCORE_RES_FLAT_VALUES,
				picMeta?.properties?.["panoramax:horizontal_pixel_density"]
			);
			// Note: score is also calculated in utils/map code
			const generalGrade = Math.round((resGrade || 1) * QUALITYSCORE_POND_RES + (gpsGrade || 1) * QUALITYSCORE_POND_GPS);

			const qualityData = [
				{ section: this._t.gvs.metadata_quality_score, value: showQualityScore(generalGrade) },
				{ section: this._t.gvs.metadata_quality_gps_score, value: showGrade(gpsGrade, this._t) },
				{ section: this._t.gvs.metadata_quality_resolution_score, value: showGrade(resGrade, this._t) },
			];
			popupContent.push(createTable("gvs-table-light", qualityData));
		}

		// EXIF
		if (picMeta.properties?.exif) {
			const exifDetails = document.createElement("details");
			exifDetails.appendChild(createHeader("summary", `${fat(faGear)} ${this._t.gvs.metadata_exif}`));
	
			const exifData = Object.entries(picMeta.properties.exif).sort().map(([key, value]) => ({ section: key, value: value }));
			exifDetails.appendChild(createTable("", exifData));
			popupContent.push(exifDetails);
		}
	
		this._viewer.setPopup(true, popupContent);
		this._viewer.dispatchEvent(new CustomEvent("focus-changed", { detail: { focus: "meta" } }));
	}

	_showQualityScoreDoc() {
		const popupContent = [];
		popupContent.push(createHeader("h4", `${fat(faMedal)} ${this._t.gvs.qualityscore_title}`));

		const link = document.createElement("a");
		link.setAttribute("href", "https://docs.panoramax.fr/pictures-metadata/quality_score/");
		link.setAttribute("target", "_blank");
		link.appendChild(document.createTextNode(this._t.gvs.qualityscore_doc_link));
		
		[
			document.createTextNode(this._t.gvs.qualityscore_doc_1),
			document.createTextNode(this._t.gvs.qualityscore_doc_2),
			showQualityScore(5),
			document.createTextNode(this._t.gvs.qualityscore_doc_3),
			link
		].forEach(elem => {
			const p = document.createElement("p");
			p.appendChild(elem);
			popupContent.push(p);
		});

		this._viewer.setPopup(true, popupContent);
	}

	_showReportForm() {
		const picMeta = this._viewer.psv.getPictureMetadata();
		if (!picMeta) { throw new Error("No picture currently selected"); }
	
		const popupContent = [];
		popupContent.push(createHeader("h4", `${fat(faTriangleExclamation)} ${this._t.gvs.report}`));

		const userAccount = getUserAccount();
		if(userAccount) {
			const accountInfo = document.createElement("p");
			accountInfo.appendChild(document.createTextNode(this._t.gvs.report_auth.replace("{a}", userAccount.name)));
			popupContent.push(accountInfo);
		}

		const form = document.createElement("form");
		popupContent.push(form);

		// Nature of the issue
		const issueGrp = document.createElement("div");
		issueGrp.classList.add("gvs-input-group");
		const issueLabel = createLabel("gvs-report-issue", this._t.gvs.report_nature_label, faCircleInfo);
		const issueSelect = document.createElement("select");
		issueSelect.name = "gvs-report-issue";
		issueSelect.required = true;
		
		const issueOptions = [
			"", "blur_missing", "blur_excess", "inappropriate", "privacy",
			"picture_low_quality", "mislocated", "copyright", "other"
		];
	
		issueOptions.forEach(optionValue => {
			const option = document.createElement("option");
			option.value = optionValue;
			option.textContent = this._t.gvs.report_nature[optionValue];
			if(optionValue === "") {
				option.setAttribute("disabled", "");
				option.setAttribute("selected", "");
				option.setAttribute("hidden", "");
			}
			issueSelect.appendChild(option);
		});
	
		issueGrp.appendChild(issueLabel);
		issueGrp.appendChild(issueSelect);
		form.appendChild(issueGrp);

		// Picture or sequence ?
		const wholeSeqGrp = document.createElement("div");
		wholeSeqGrp.classList.add("gvs-input-group", "gvs-input-group-inline");
		const picSeqInput = document.createElement("input");
		picSeqInput.id = "gvs-report-whole-sequence";
		picSeqInput.name = "gvs-report-whole-sequence";
		picSeqInput.type = "checkbox";
		const picSeqLabel = createLabel("gvs-report-whole-sequence", this._t.gvs.report_whole_sequence);
		wholeSeqGrp.appendChild(picSeqInput);
		wholeSeqGrp.appendChild(picSeqLabel);
		form.appendChild(wholeSeqGrp);

		// Additional details
		const dtlsGrp = document.createElement("div");
		dtlsGrp.classList.add("gvs-input-group");
		const detailsLabel = createLabel("gvs-report-details", this._t.gvs.report_details, faCommentDots);
		const detailsTextarea = document.createElement("textarea");
		detailsTextarea.name = "gvs-report-details";
		detailsTextarea.placeholder = this._t.gvs.report_details_placeholder;
		dtlsGrp.appendChild(detailsLabel);
		dtlsGrp.appendChild(detailsTextarea);
		form.appendChild(dtlsGrp);

		// Reporter email
		let emailInput;
		if(!userAccount) {
			const emailGrp = document.createElement("div");
			emailGrp.classList.add("gvs-input-group");
			const emailLabel = createLabel("email", this._t.gvs.report_email, faAt);
			emailInput = document.createElement("input");
			emailInput.type = "email";
			emailInput.name = "email";
			emailInput.placeholder = this._t.gvs.report_email_placeholder;
			emailGrp.appendChild(emailLabel);
			emailGrp.appendChild(emailInput);
			form.appendChild(emailGrp);
		}

		// Submit button
		const submitGrp = document.createElement("div");
		submitGrp.classList.add("gvs-input-btn");
		const submitButton = document.createElement("button");
		submitButton.type = "submit";
		submitButton.appendChild(fa(faPaperPlane));
		submitButton.appendChild(document.createTextNode(this._t.gvs.report_submit));
		submitGrp.appendChild(submitButton);
		form.appendChild(submitGrp);

		// Submit handler
		form.addEventListener("submit", e => {
			e.preventDefault();
			const params = {
				issue: issueSelect.value,
				picture_id: picSeqInput.checked ? null : picMeta.id,
				reporter_comments: detailsTextarea.value,
				reporter_email: emailInput?.value,
				sequence_id: picMeta.sequence.id
			};

			// Show loader
			this._viewer.setPopup(true, [
				createHeader("h4", `${fat(faTriangleExclamation)} ${this._t.gvs.report}`),
				document.createTextNode(this._t.gvs.report_wait)
			]);

			// Call API
			this._viewer._api.sendReport(params).then(() => {
				this._viewer.setPopup(true, [
					createHeader("h4", `${fat(faTriangleExclamation)} ${this._t.gvs.report}`),
					document.createTextNode(this._t.gvs.report_success)
				]);
			}).catch(e => {
				console.error(e);
				this._viewer.setPopup(true, [
					createHeader("h4", `${fat(faTriangleExclamation)} ${this._t.gvs.report}`),
					document.createTextNode(this._t.gvs.report_failure.replace("{e}", e))
				]);
			});
		});

		this._viewer.setPopup(true, popupContent);
		this._viewer.dispatchEvent(new CustomEvent("focus-changed", { detail: { focus: "meta" } }));
	}
	
	/**
	 * Creates expand/reduce mini component.
	 * This should be called only if map is enabled.
	 * @private
	 */
	_initWidgetMiniActions() {
		// Mini widget expand
		const imgExpand = document.createElement("img");
		imgExpand.alt = "";
		imgExpand.height = 120;
		imgExpand.draggable = false;
		imgExpand.src = SwitchBig;
		const lblExpand = document.createElement("span");
		lblExpand.classList.add("gvs-mobile-hidden");
		lblExpand.appendChild(document.createTextNode(this._t.gvs.expand));
		const btnExpand = createButton("gvs-mini-expand", lblExpand, this._t.gvs.expand_info, ["gvs-only-mini", "gvs-print-hidden"]);
		btnExpand.appendChild(imgExpand);
		this._corners["mini-top-right"].appendChild(btnExpand);
		btnExpand.addEventListener("click", () => {
			this._viewer.setFocus(this._viewer.isMapWide() ? "pic" : "map");
		});

		// Mini widget hide
		const imgReduce = document.createElement("img");
		imgReduce.alt = this._t.gvs.minimize_short;
		imgReduce.height = 120;
		imgReduce.draggable = false;
		imgReduce.src = SwitchMini;
		const btnHide = createButton("gvs-mini-hide", imgReduce, this._t.gvs.minimize, ["gvs-only-mini", "gvs-print-hidden"]);
		this._corners["mini-bottom-left"].appendChild(btnHide);
		btnHide.addEventListener("click", () => {
			this._viewer.setUnfocusedVisible(false);
		});

		// Mini widget show
		const btnShow = createButton("gvs-mini-show", null, null, ["gvs-btn-large", "gvs-only-mini-hidden", "gvs-print-hidden"]);
		this._corners["main-bottom-left"].appendChild(btnShow);
		btnShow.addEventListener("click", () => {
			if(isInIframe()) {
				this._viewer.setFocus(this._viewer.isMapWide() ? "pic" : "map");
			}
			else {
				this._viewer.setUnfocusedVisible(true);
			}
		});

		const miniBtnRendering = () => {
			if(this._viewer.map && this._viewer.isMapWide()) {
				btnShow.title = this._t.gvs.show_psv;
				btnShow.innerHTML = fat(faPanorama);
			}
			else {
				btnShow.title = this._t.gvs.show_map;
				btnShow.innerHTML = fat(faMap);
			}
		};

		miniBtnRendering();
		this._viewer.addEventListener("focus-changed", miniBtnRendering);
	}

	/**
	 * Creates search bar component.
	 * This should be called only if map is enabled.
	 * @private
	 */
	_initWidgetSearch() {
		const overridenGeocoder = query => {
			const rgxCoords = /([-+]?\d{1,2}\.\d+),\s*([-+]?\d{1,3}\.\d+)/;
			const coordsMatch = query.match(rgxCoords);
			const rgxUuid = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/;
			const uuidMatch = query.match(rgxUuid);
		
			if(coordsMatch) {
				const lat = parseFloat(coordsMatch[1]);
				const lon = parseFloat(coordsMatch[2]);
				this._viewer.map.flyTo({
					center: [lon, lat],
					zoom: 16,
				});
				return Promise.resolve(true);
			}
			else if(uuidMatch) {
				this._viewer.select(null, query);
				return Promise.resolve(true);
			}
			else {
				return this._viewer.map.geocoder({
					query,
					limit: 3,
					bbox: this._viewer.map.getBounds().toArray().map(d => d.join(",")).join(","),
					proximity: this._viewer.map.getCenter().lat+","+this._viewer.map.getCenter().lng,
				}).then(data => {
					data = data.features.map(f => ({
						title: f.place_name.split(",")[0],
						subtitle: f.place_name.split(",").slice(1).join(", "),
						data: f
					}));
					return data;
				});
			}
		};
		const geocoder = createSearchBar(
			"gvs-widget-search-bar",
			this._t.gvs.search_address,
			overridenGeocoder,
			(entry) => {
				if(entry) {
					if(entry.data.bounds) {
						this._viewer.map.fitBounds(entry.data.bounds);
					}
					else {
						this._viewer.map.flyTo({
							center: entry.data.center,
							zoom: entry.data.zoom || 13,
						});
					}
				}
			},
			this,
			undefined,
			this._viewer.isWidthSmall(),
			this._viewer.map._geolocate,
		);

		createGroup(
			"gvs-widget-search",
			this._viewer.isWidthSmall() ? "main-top-right" : "main-top-left",
			this,
			[geocoder],
			["gvs-only-map", "gvs-print-hidden"]
		);
	}

	/**
	 * Creates the map layers component.
	 * This should be called only if map is enabled.
	 * @private
	 */
	_initWidgetMapLayers() {
		const btnLayers = createExpandableButton("gvs-map-layers", faLayerGroup, this._t.gvs.layers, this);
		const pnlLayers = createPanel(this, btnLayers, []);
		createGroup(
			"gvs-widget-map-layers",
			"main-top-right",
			this,
			[btnLayers, pnlLayers],
			["gvs-group-large", "gvs-group-btnpanel", "gvs-only-map", "gvs-print-hidden"]
		);

		// Map background selector
		if(this._viewer.map.hasTwoBackgrounds()) {
			pnlLayers.innerHTML = `
				<h4>${fat(faEarthEurope)} ${this._t.gvs.map_background}</h4>
				<div id="gvs-map-bg" class="gvs-input-group">
					<input type="radio" id="gvs-map-bg-streets" name="gvs-map-bg" value="streets" />
					<label for="gvs-map-bg-streets">
						<img id="gvs-map-bg-streets-img" alt="" />
						${this._t.gvs.map_background_streets}
					</label>
					<input type="radio" id="gvs-map-bg-aerial" name="gvs-map-bg" value="aerial" />
					<label for="gvs-map-bg-aerial">
						<img id="gvs-map-bg-aerial-img" alt="" />
						${this._t.gvs.map_background_aerial}
					</label>
				</div>`;
		}

		// Map theme selector
		pnlLayers.innerHTML += `
			<h4>${fat(faPalette)} ${this._t.gvs.map_theme}</h4>
			<div class="gvs-input-group">
				<select id="gvs-map-theme" style="width: 100%;">
					<option value="default">${this._t.gvs.map_theme_default}</option>
					<option value="age">${this._t.gvs.map_theme_age}</option>
					<option value="type">${this._t.gvs.map_theme_type}</option>
					${this._viewer?.map?._hasQualityScore() ? "<option value=\"score\">"+this._t.gvs.map_theme_score+"</option>" : ""}
				</select>
			</div>
			<div>
				<div id="gvs-map-theme-legend-age" class="gvs-map-theme-legend gvs-hidden">
					<div>
						<div class="gvs-map-theme-legend-entry">
							<span class="gvs-map-theme-color" style="background-color: ${COLORS["PALETTE_4"]}"></span>
							${this._t.gvs["map_theme_age_4"]}
						</div>
						<div class="gvs-map-theme-legend-entry">
							<span class="gvs-map-theme-color" style="background-color: ${COLORS["PALETTE_3"]}"></span>
							${this._t.gvs["map_theme_age_3"]}
						</div>
					</div>
					<div>
						<div class="gvs-map-theme-legend-entry">
							<span class="gvs-map-theme-color" style="background-color: ${COLORS["PALETTE_2"]}"></span>
							${this._t.gvs["map_theme_age_2"]}
						</div>
						<div class="gvs-map-theme-legend-entry">
							<span class="gvs-map-theme-color" style="background-color: ${COLORS["PALETTE_1"]}"></span>
							${this._t.gvs["map_theme_age_1"]}
						</div>
					</div>
				</div>
				<div id="gvs-map-theme-legend-type" class="gvs-map-theme-legend gvs-hidden">
					<div class="gvs-map-theme-legend-entry">
						<span class="gvs-map-theme-color" style="background-color: ${COLORS.QUALI_1}"></span>
						${this._t.gvs.picture_360}
					</div>
					<div class="gvs-map-theme-legend-entry">
						<span class="gvs-map-theme-color" style="background-color: ${COLORS.QUALI_2}"></span>
						${this._t.gvs.picture_flat}
					</div>
				</div>
				<div id="gvs-map-theme-legend-score" class="gvs-map-theme-legend gvs-hidden">
					${QUALITYSCORE_VALUES.map(pv => "<span class=\"gvs-qualityscore\" style=\"background-color: "+pv.color+";\">"+pv.label+"</span>").join("")}
					<button id="gvs-map-theme-quality-help" class="gvs-btn-link" title="${this._t.gvs.metadata_quality_help}">${fat(faInfoCircle, {transform: {x: 6, size: 24}})}</button>
				</div>
			</div>`;

		pnlLayers.querySelector("#gvs-map-theme-quality-help").addEventListener("click", () => this._showQualityScoreDoc());

		// Map theme events
		const fMapTheme = pnlLayers.querySelector("#gvs-map-theme");
		const onChange = () => {
			this._onMapThemeChange();
			this._onMapFiltersChange();
		};
		fMapTheme.addEventListener("change", onChange);
		fMapTheme.addEventListener("keypress", onChange);
		fMapTheme.addEventListener("paste", onChange);
		fMapTheme.addEventListener("input", onChange);

		// Map background events
		if(this._viewer.map.hasTwoBackgrounds()) {
			const imgBgAerial = pnlLayers.querySelector("#gvs-map-bg-aerial-img");
			imgBgAerial.src = BackgroundAerial;
			const imgBgStreets = pnlLayers.querySelector("#gvs-map-bg-streets-img");
			imgBgStreets.src = BackgroundStreets;
			const radioBgAerial = pnlLayers.querySelector("#gvs-map-bg-aerial");
			const radioBgStreets = pnlLayers.querySelector("#gvs-map-bg-streets");
			const onBgChange = e => {
				this._viewer.map.setBackground(e.target.value);
			};
			radioBgAerial.addEventListener("change", onBgChange);
			radioBgStreets.addEventListener("change", onBgChange);
			this._viewer.addEventListener("map:background-changed", e => this._onMapBackgroundChange(e.detail.background));
			this._onMapBackgroundChange(this._viewer.map.getBackground());
		}
	}

	/**
	 * Change the selected background in radio buttons
	 * @param {string} bg The background to use
	 * @private
	 */
	_onMapBackgroundChange(bg) {
		const radioBgAerial = document.getElementById("gvs-map-bg-aerial");
		const radioBgStreets = document.getElementById("gvs-map-bg-streets");
		if(bg === "aerial") { radioBgAerial.checked = true; }
		else { radioBgStreets.checked = true; }
	}

	/**
	 * Updates map theme legend when theme changes.
	 * @private
	 */
	_onMapThemeChange() {
		const fMapTheme = document.getElementById("gvs-map-theme");
		const layerBtn = document.getElementById("gvs-map-layers");
		const t = fMapTheme.value;
		layerBtn.setActive(t !== "default");
		for(let d of document.getElementsByClassName("gvs-map-theme-legend")) {
			if(d.id == "gvs-map-theme-legend-"+t) {
				d.classList.remove("gvs-hidden");
			}
			else {
				d.classList.add("gvs-hidden");
			}
		}
	}

	/**
	 * Creates pictures filters component.
	 * This should be called only if map is enabled.
	 * @private
	 */
	_initWidgetFilters(hasUserSearch, hasQualityScore) {
		const btnFilter = createExpandableButton("gvs-filter", faSliders, this._t.gvs.filters, this, ["gvs-filter-unset-btn"]);
		const pnlFilter = createPanel(this, btnFilter, []);
		pnlFilter.innerHTML = `
			<form id="gvs-filter-form">
				<div class="gvs-filter-block">
					<div class="gvs-filter-zoomin">${this._t.gvs.filter_zoom_in}</div>
					<h4>${fat(faCalendar)} ${this._t.gvs.filter_date}</h4>
					<div class="gvs-input-shortcuts">
						<button data-for="gvs-filter-date-from" data-value="${new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split("T")[0]}">${this._t.gvs.filter_date_1month}</button>
						<button data-for="gvs-filter-date-from" data-value="${new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split("T")[0]}">${this._t.gvs.filter_date_1year}</button>
					</div>
					<div class="gvs-input-group">
						<input type="date" id="gvs-filter-date-from" />
						${fat(faArrowRight)}
						<input type="date" id="gvs-filter-date-end" />
					</div>
				</div>
				<div class="gvs-filter-block">
					<h4>${fat(faImage)} ${this._t.gvs.filter_picture}</h4>
					<div class="gvs-input-group gvs-checkbox-btns" style="justify-content: center;">
						<input type="checkbox" id="gvs-filter-type-flat" name="flat" />
						<label for="gvs-filter-type-flat">${fat(faImage)} ${this._t.gvs.picture_flat}</label>
						<input type="checkbox" id="gvs-filter-type-360" name="360" />
						<label for="gvs-filter-type-360">${fat(faPanorama)} ${this._t.gvs.picture_360}</label>
					</div>
				</div>
			</form>
		`;
		const form = pnlFilter.children[0];
		createGroup(
			"gvs-widget-filter",
			this._viewer.isWidthSmall() ? "main-top-right" : "main-top-left",
			this,
			[btnFilter, pnlFilter],
			["gvs-group-large", "gvs-group-btnpanel", "gvs-only-map", "gvs-print-hidden"]
		);
		
		const resetBtn = btnFilter.querySelector(".gvs-filter-unset-btn");
		if(resetBtn) {
			resetBtn.addEventListener("click", e => {
				e.stopPropagation();
				form.reset();
			});
		}

		if(this._viewer.isWidthSmall()) {
			pnlFilter.style.width = `${this._viewer.container.offsetWidth - 70}px`;
		}

		// Create qualityscore filter
		if(hasQualityScore) {
			const block = document.createElement("div");
			block.classList.add("gvs-filter-block");
			form.appendChild(block);

			const zoomLbl = document.createElement("div");
			zoomLbl.classList.add("gvs-filter-zoomin");
			zoomLbl.appendChild(document.createTextNode(this._t.gvs.filter_zoom_in));
			block.appendChild(zoomLbl);

			const title = document.createElement("h4");
			title.innerHTML = `${fat(faMedal)} ${this._t.gvs.filter_qualityscore} <button class="gvs-btn-link" title="${this._t.gvs.metadata_quality_help}">${fat(faInfoCircle)}</button>`;
			title.style.marginBottom = "3px";
			title.lastChild.addEventListener("click", () => this._showQualityScoreDoc());
			block.appendChild(title);

			const div = document.createElement("div");
			div.id = "gvs-filter-qualityscore";
			div.classList.add("gvs-input-group");

			QUALITYSCORE_VALUES.forEach(pv => {
				const input = document.createElement("input");
				input.id = "gvs-filter-qualityscore-" + pv.label;
				input.type = "checkbox";
				input.name = "qualityscore";
				input.value = pv.label;

				const label = document.createElement("label");
				label.setAttribute("for", input.id);
				label.title = this._t.gvs.filter_qualityscore_help;
				label.appendChild(document.createTextNode(pv.label));
				label.style.backgroundColor = pv.color;

				div.appendChild(input);
				div.appendChild(label);
			});

			block.appendChild(div);
		}

		// Create search bar for users
		if(hasUserSearch) {
			const block = document.createElement("div");
			block.classList.add("gvs-filter-block");
			form.appendChild(block);

			const title = document.createElement("h4");
			title.innerHTML = `${fat(faUser)} ${this._t.gvs.filter_user}`;
			block.appendChild(title);

			// Shortcut for my own pictures
			const userAccount = getUserAccount();
			let mypics;
			if(userAccount) {
				const shortcuts = document.createElement("div");
				shortcuts.classList.add("gvs-input-shortcuts");
				mypics = document.createElement("button");
				mypics.appendChild(document.createTextNode(this._t.gvs.filter_user_mypics));
				shortcuts.appendChild(mypics);
				block.appendChild(shortcuts);
			}

			const input = document.createElement("div");
			input.id = "gvs-filter-user";
			input.classList.add("gvs-input-group");

			let userSearch;
			userSearch = createSearchBar(
				"gvs-filter-search-user",
				this._t.gvs.search_user,
				q => {
					userSearch.classList.remove("gvs-filter-active");
					return this._viewer._api.searchUsers(q)
						.then(data => ((data || [])
							.map(f => ({
								title: f.label,
								data: f
							}))
						));
				},
				d => {
					if(d) { userSearch.classList.add("gvs-filter-active"); }
					else { userSearch.classList.remove("gvs-filter-active"); }
					return this._viewer.map.setVisibleUsers(d ? [d.data.id] : ["geovisio"]);
				},
				this,
				true
			);
			block.addEventListener("reset", () => {
				userSearch.classList.remove("gvs-filter-active");
				userSearch.resetSearch();
			});
			input.appendChild(userSearch);
			block.appendChild(input);

			// Trigger "my pictures" shortcut action
			if(userAccount) {
				mypics.addEventListener("click", () => {
					const userInput = userSearch.querySelector("input");
					if(userInput.value === userAccount.name) {
						userSearch.resetSearch();
					}
					else {
						userInput.goItem({ title: userAccount.name, data: { id: userAccount.id } });
					}
				});
			}
		}

		// Shortcuts
		pnlFilter.querySelectorAll(".gvs-input-shortcuts button").forEach(btn => {
			btn.addEventListener("click", () => {
				const elem = document.getElementById(btn.getAttribute("data-for"));
				const val = btn.getAttribute("data-value");
				if(elem) {
					if(elem.value !== val) { elem.value = val; }
					else { elem.value = ""; }
				}
			});
		});

		// Fields change events (for active highlighting)
		const fMinDate = document.getElementById("gvs-filter-date-from");
		const fMaxDate = document.getElementById("gvs-filter-date-end");
		[fMinDate, fMaxDate].forEach(f => {
			f.addEventListener("change", () => {
				if(f.value) { f.classList.add("gvs-filter-active"); }
				else { f.classList.remove("gvs-filter-active"); }
			});
		});

		// Form update events
		this._formDelay = null;

		const onFormChange = () => {
			if(this._formDelay) { clearTimeout(this._formDelay); }

			this._formDelay = setTimeout(() => {
				this._onMapFiltersChange();
			}, 250);
		};

		form.addEventListener("change", onFormChange);
		form.addEventListener("reset", onFormChange);
		form.addEventListener("submit", e => {
			onFormChange(e);
			e.preventDefault();
			return false;
		}, true);

		for(let i of form.getElementsByTagName("input")) {
			i.addEventListener("change", onFormChange);
			i.addEventListener("keypress", onFormChange);
			i.addEventListener("paste", onFormChange);
			i.addEventListener("input", onFormChange);
		}
	}

	/**
	 * Send viewer new map filters values.
	 * @private
	 */
	_onMapFiltersChange() {
		const fMinDate = document.getElementById("gvs-filter-date-from");
		const fMaxDate = document.getElementById("gvs-filter-date-end");
		const fTypeFlat = document.getElementById("gvs-filter-type-flat");
		const fType360 = document.getElementById("gvs-filter-type-360");
		const fMapTheme = document.getElementById("gvs-map-theme");

		let type = "";
		if(fType360.checked && !fTypeFlat.checked) { type = "equirectangular"; }
		if(!fType360.checked && fTypeFlat.checked) { type = "flat"; }

		let qualityscore = [];
		if(this._viewer?.map?._hasQualityScore()) {
			const fScoreA = document.getElementById("gvs-filter-qualityscore-A");
			const fScoreB = document.getElementById("gvs-filter-qualityscore-B");
			const fScoreC = document.getElementById("gvs-filter-qualityscore-C");
			const fScoreD = document.getElementById("gvs-filter-qualityscore-D");
			const fScoreE = document.getElementById("gvs-filter-qualityscore-E");
			if(fScoreA.checked) { qualityscore.push(5); }
			if(fScoreB.checked) { qualityscore.push(4); }
			if(fScoreC.checked) { qualityscore.push(3); }
			if(fScoreD.checked) { qualityscore.push(2); }
			if(fScoreE.checked) { qualityscore.push(1); }
			if(qualityscore.length == 5) { qualityscore = []; }
		}

		const values = {
			minDate: fMinDate.value,
			maxDate: fMaxDate.value,
			type,
			theme: fMapTheme.value,
			qualityscore,
		};

		this._viewer.setFilters(values);
	}

	/**
	 * Listen to viewer events to follow map filters changes.
	 * @private
	 */
	_listenMapFiltersChanges() {
		const btnFilter = document.getElementById("gvs-filter");
		const fMinDate = document.getElementById("gvs-filter-date-from");
		const fMaxDate = document.getElementById("gvs-filter-date-end");
		const fTypeFlat = document.getElementById("gvs-filter-type-flat");
		const fType360 = document.getElementById("gvs-filter-type-360");
		const fMapTheme = document.getElementById("gvs-map-theme");
		const fScoreA = document.getElementById("gvs-filter-qualityscore-A");
		const fScoreB = document.getElementById("gvs-filter-qualityscore-B");
		const fScoreC = document.getElementById("gvs-filter-qualityscore-C");
		const fScoreD = document.getElementById("gvs-filter-qualityscore-D");
		const fScoreE = document.getElementById("gvs-filter-qualityscore-E");

		// Update widget based on programmatic filter changes
		this._viewer.addEventListener("filters-changed", e => {
			if(e.detail.minDate) {
				fMinDate.value = e.detail.minDate;
				fMinDate.classList.add("gvs-filter-active");
			}
			else { fMinDate.classList.remove("gvs-filter-active"); }
			if(e.detail.maxDate) {
				fMaxDate.value = e.detail.maxDate;
				fMaxDate.classList.add("gvs-filter-active");
			}
			else { fMaxDate.classList.remove("gvs-filter-active"); }
			if(e.detail.theme) { fMapTheme.value = e.detail.theme; }
			if(e.detail.type) {
				fType360.checked = ["", "equirectangular"].includes(e.detail.type);
				fTypeFlat.checked = ["", "flat"].includes(e.detail.type);
			}
			if(e.detail.qualityscore) {
				fScoreA.checked = e.detail.qualityscore.includes(5) && e.detail.qualityscore.length < 5;
				fScoreB.checked = e.detail.qualityscore.includes(4) && e.detail.qualityscore.length < 5;
				fScoreC.checked = e.detail.qualityscore.includes(3) && e.detail.qualityscore.length < 5;
				fScoreD.checked = e.detail.qualityscore.includes(2) && e.detail.qualityscore.length < 5;
				fScoreE.checked = e.detail.qualityscore.includes(1) && e.detail.qualityscore.length < 5;
			}
			let activeFilters = (
				Object.keys(e.detail).filter(d => d && d !== "theme").length > 0
				|| this._viewer.map.getVisibleUsers().filter(u => u !== "geovisio").length > 0
			);
			btnFilter.setActive(activeFilters);
			this._onMapThemeChange();
		});

		// Listen to user visibility changes to switch the filter active icon
		this._viewer.addEventListener("map:users-changed", e => {
			let activeFilters = (
				Object.keys(this._viewer._mapFilters).filter(d => d && d !== "theme").length > 0
				|| e.detail.usersIds.filter(u => u !== "geovisio").length > 0
			);
			btnFilter.setActive(activeFilters);
		});

		// Show/hide zoom in warning when map zoom changes
		const lblsZoomIn = document.getElementsByClassName("gvs-filter-zoomin");
		const changeLblZoomInDisplay = () => {
			for(let lblZoomIn of lblsZoomIn) {
				if(this._viewer.map.getZoom() < 7) { lblZoomIn.style.display = null; }
				else { lblZoomIn.style.display = "none"; }
			}
		};
		changeLblZoomInDisplay();
		this._viewer.map.on("zoomend", changeLblZoomInDisplay);
	}

	/**
	 * Creates share map/picture widget.
	 * @private
	 */
	_initWidgetShare() {
		const btnShare = createButton("gvs-share", fa(faShareNodes), this._t.gvs.share, ["gvs-btn-large"]);
		const pnlShare = createPanel(this, btnShare, []);
		pnlShare.innerHTML = `
			<div class="gvs-hidden gvs-needs-picture">
				<p id="gvs-share-license" style="margin: 0 0 10px 0;"></p>
			</div>
			<h4 style="margin-top: 0">${fat(faLink)} ${this._t.gvs.share_links}</h4>
			<div id="gvs-share-links" class="gvs-input-btn">
				<a id="gvs-share-image" class="gvs-link-btn gvs-hidden gvs-needs-picture" download target="_blank">${fat(faCloudArrowDown)} ${this._t.gvs.share_image}</a>
				<button id="gvs-share-url" data-copy="true" style="flex-basis: 100%; flex-grow: 2; flex-shrink: 2;">${fat(faCopy)} ${this._t.gvs.share_page}</button>
				<button id="gvs-share-print" style="flex-basis: 100%; flex-grow: 2; flex-shrink: 2;">${fat(faPrint)} ${this._t.gvs.share_print}</button>
			</div>
			<h4>
				${fat(faMap)} ${this._t.gvs.share_embed}
				<a href="https://docs.panoramax.fr/web-viewer/03_URL_settings/"
					title="${this._t.gvs.share_embed_docs}"
					target="_blank"
					style="vertical-align: middle">
					${fat(faCircleInfo)}
				</a>
			</h4>
			<div class="gvs-input-btn">
				<textarea id="gvs-share-iframe" readonly></textarea>
				<button data-input="gvs-share-iframe">${fat(faCopy)} ${this._t.gvs.copy}</button>
			</div>
			<h4 class="gvs-hidden gvs-needs-picture">${fat(faPen)} ${this._t.gvs.edit_osm}</h4>
			<div class="gvs-input-btn gvs-hidden gvs-needs-picture" style="justify-content: center">
				<a id="gvs-edit-id" class="gvs-link-btn" target="_blank">${fat(faLocationDot)} ${this._t.gvs.id}</a>
				<button id="gvs-edit-josm" title="${this._t.gvs.josm_live}">${fat(faSatelliteDish)} ${this._t.gvs.josm}</button>
			</div>
		`;
		createGroup(
			"gvs-widget-share",
			"main-bottom-right",
			this,
			[btnShare, pnlShare],
			["gvs-group-large", "gvs-group-btnpanel", "gvs-mobile-hidden", "gvs-print-hidden"]
		);

		const grpLinks = document.getElementById("gvs-share-links");
		const hdLink = document.getElementById("gvs-share-image");
		const pageLink = document.getElementById("gvs-share-url");

		// Add RSS link if available
		if(this._viewer._api.getRSSURL()) {
			const btnRss = document.createElement("a");
			btnRss.id = "gvs-share-rss";
			btnRss.classList.add("gvs-link-btn");
			btnRss.setAttribute("target", "_blank");
			btnRss.setAttribute("title", this._t.gvs.share_rss_title);
			btnRss.appendChild(fa(faSquareRss));
			btnRss.appendChild(document.createTextNode(this._t.gvs.share_rss));
			grpLinks.insertBefore(btnRss, pageLink);
		}

		// Update picture download links
		this._viewer.addEventListener("psv:picture-loaded", () => {
			const picMeta = this._viewer.psv.getPictureMetadata();
			hdLink.href = picMeta?.panorama?.hdUrl;

			const lblLicense = document.getElementById("gvs-share-license");
			lblLicense.innerHTML = picMeta?.caption?.license ? this._t.gvs.legend_license.replace("{l}", picMeta.caption.license) : "";

			const picElems = pnlShare.getElementsByClassName("gvs-needs-picture");
			for(let i=0; i < picElems.length; i++) {
				const h = picElems[i];
				if(picMeta) {
					h.classList.remove("gvs-hidden");
				}
				else {
					h.classList.add("gvs-hidden");
				}
			}
		});

		// Update links
		const updateLinks = e => {
			const baseUrl = e?.detail?.url || window.location.href.replace(/\/$/, "");
			const iframeBaseUrl = this._options.iframeBaseURL ?
				this._options.iframeBaseURL + window.location.hash
				: baseUrl;
			const fUrl = pnlShare.querySelector("#gvs-share-url");
			const fIframe = pnlShare.querySelector("#gvs-share-iframe");
			const btnId = pnlShare.querySelector("#gvs-edit-id");
			const btnRss = pnlShare.querySelector("#gvs-share-rss");

			fUrl.setAttribute("data-copy", this._viewer?._hash?.getShortLink(baseUrl) || baseUrl);
			fIframe.innerText = `<iframe src="${iframeBaseUrl}" style="border: none; width: 500px; height: 300px"></iframe>`;

			const meta = this._viewer.psv.getPictureMetadata();
			if(meta) {
				const idOpts = {
					"map": `19/${meta.gps[1]}/${meta.gps[0]}`,
					"source": "Panoramax",
					"photo_overlay": "panoramax",
					"photo": `panoramax/${meta.id}`,
				};
				btnId.setAttribute("href", `${this._options.editIdUrl}#${new URLSearchParams(idOpts).toString()}`);
			}

			if(btnRss) {
				btnRss.setAttribute("href", this._viewer._api.getRSSURL(this._viewer?.map?.getBounds()));
			}
		};
		
		updateLinks();
		this._viewer.addEventListener("ready", updateLinks, { once: true });
		this._viewer?._hash?.addEventListener("url-changed", updateLinks);

		// Copy to clipboard on button click
		enableCopyButton(pnlShare, this._viewer._t);

		// JOSM live edit button
		const btnJosm = pnlShare.querySelector("#gvs-edit-josm");
		btnJosm.addEventListener("click", () => {
			// Disable
			if(btnJosm.classList.contains("gvs-btn-active")) {
				this._viewer.toggleJOSMLive(false);
			}
			// Enable
			else {
				this._viewer.toggleJOSMLive(true).catch(e => {
					console.warn(e);
					alert(this._t.gvs.error_josm);
				});
			}
		});
		this._viewer.addEventListener("josm-live-enabled", () => btnJosm.classList.add("gvs-btn-active"));
		this._viewer.addEventListener("josm-live-disabled", () => btnJosm.classList.remove("gvs-btn-active"));

		// Print button
		const printLink = pnlShare.querySelector("#gvs-share-print");
		printLink.addEventListener("click", window.print.bind(window));
	}
}
