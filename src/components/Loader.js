import "./Loader.css";
import LogoDead from "../img/logo_dead.svg";
import LoaderImg from "../img/marker.svg";

/**
 * Loader is a full-screen loading message.
 * @private
 * 
 * @param {CoreView} parent The parent view
 * @param {Element} container The DOM element to create loader into
 */
export default class Loader {
	constructor(parent, container) {
		this._parent = parent;
		this.container = container;
		this.container.classList.add("gvs-loader", "gvs-loader-visible");

		// Logo
		const logo = document.createElement("img");
		logo.src = LoaderImg;
		logo.alt = "";
		logo.title = this._parent._t.map.loading;
		logo.classList.add("gvs-loader-img");
		this.container.appendChild(logo);

		// Label (1 serious, then fun ones)
		const labelWrapper = document.createElement("div");
		const label = document.createElement("span");
		const nextLabelFun = () => (
			this._parent._t.gvs.loading_labels_fun[
				Math.floor(Math.random() * this._parent._t.gvs.loading_labels_fun.length)
			]
		);
		label.innerHTML = this._parent._t.gvs.loading_labels_serious[
			Math.floor(Math.random() * this._parent._t.gvs.loading_labels_serious.length)
		];
		const nextLabelFct = () => setTimeout(() => {
			label.innerHTML = nextLabelFun();
			this._loaderLabelChanger = nextLabelFct();
		}, 500 + Math.random() * 1000);
		this._loaderLabelChanger = nextLabelFct();
		labelWrapper.appendChild(label);

		this.container.appendChild(labelWrapper);
	}

	/**
	 * Is the loader visible ?
	 * @returns {boolean} True if visible
	 */
	isVisible() {
		return this.container.classList.contains("gvs-loader-visible");
	}

	/**
	 * Dismiss loader, or show error
	 * @param {object} [err] Optional error object to show in browser console
	 * @param {str} [errMeaningful] Optional error message to show to user
	 * @param {fct} [next] Optional function to run after loader dismiss
	 */
	dismiss(err = null, errMeaningful = null, next = null) {
		clearTimeout(this._loaderLabelChanger);

		if(!err) {
			this.container.classList.remove("gvs-loader-visible");
			setTimeout(() => this.container.remove(), 2000);

			/**
			 * Event for viewer being ready to use (API loaded)
			 *
			 * @event ready
			 * @memberof CoreView
			 */
			const readyEvt = new CustomEvent("ready");
			this._parent.dispatchEvent(readyEvt);

			if(next) { next(); }
		}
		else {
			if(err !== true) { console.error(err); }

			// Change content
			this.container.children[0].src = LogoDead;
			this.container.children[0].style.width = "200px";
			this.container.children[0].style.animation = "unset";

			let errHtml;
			if(next) {
				errHtml = `<button class="gvs-loader-cta">${this._parent._t.gvs.error_click}</button>`;
			}
			else {
				errHtml = `<small>${this._parent._t.gvs.error_retry}</small>`;
			}

			if(errMeaningful) { errHtml = errMeaningful + "<br />" + errHtml; }
			this.container.children[1].innerHTML = `${this._parent._t.gvs.error}<br />${errHtml}`;
			if(next) {
				this.container.addEventListener("click", next);
			}
			const errLabel = errMeaningful || "Panoramax JS had a blocking exception";

			/**
			 * Event for viewer failing to initially load
			 *
			 * @event broken
			 * @memberof CoreView
			 * @type {object}
			 * @property {object} detail Event information
			 * @property {string} detail.error The user-friendly error message to display
			 */
			const brokenEvt = new CustomEvent("broken", {
				detail: { error: errLabel }
			});
			this._parent.dispatchEvent(brokenEvt);

			// Throw error
			throw new Error(errLabel);
		}
	}
}