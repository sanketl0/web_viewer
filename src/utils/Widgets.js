// Every single icon imported separately to reduce bundle size
import { icon } from "@fortawesome/fontawesome-svg-core";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons/faChevronDown";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons/faMagnifyingGlass";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons/faCircleNotch";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faStar } from "@fortawesome/free-solid-svg-icons/faStar";
import { faStar as farStar } from "@fortawesome/free-regular-svg-icons/faStar";
import { QUALITYSCORE_VALUES } from "./Utils";


/**
 * Creates a new button, already styled
 * @param {string} id The component ID
 * @param {string|Element} content The text content
 * @param {string} [title] A title label on overlay
 * @param {string[]} [classes] List of CSS classes to add
 * @returns {Element} The created button
 * @private
 */
export function createButton(id, content = null, title = null, classes = []) {
	const btn = document.createElement("button");
	if(content) {
		if(content instanceof HTMLElement || content instanceof Node) {
			btn.appendChild(content);
		}
		else {
			btn.innerHTML = content;
		}
	}
	btn.id = id;
	if(Array.isArray(classes)) {
		classes = classes.filter(c => c != null && c.length > 0);
	}
	btn.classList.add("gvs-btn", "gvs-widget-bg", ...classes);
	if(title) { btn.title = title; }
	return btn;
}

/**
 * Creates a new "expandable" button, already styled
 * @param {string} id The component ID
 * @param {object} icon The FontAwesome icon definition
 * @param {string} label The label text
 * @param {Widgets} container The widgets container
 * @param {string[]} [classes] List of CSS classes to add
 * @returns {Element} The created button
 * @private
 */
export function createExpandableButton(id, icon, label, container, classes = []) {
	const btn = document.createElement("button");
	btn.id = id;
	btn.appendChild(fa(icon));
	if(!container._viewer.isWidthSmall()) {
		btn.appendChild(document.createTextNode(label));
		if(classes.includes("gvs-filter-unset-btn")) {
			const resetIcon = fa(faXmark, { classes: ["gvs-filter-unset-btn"]});
			resetIcon.style.display = "none";
			btn.appendChild(resetIcon);
			classes = classes.filter(v => v !== "gvs-filter-unset-btn");
		}
		btn.appendChild(fa(faChevronDown));
	}
	else {
		btn.title = label;
	}
	btn.classList.add("gvs-btn", "gvs-widget-bg", "gvs-btn-expandable", ...classes);
	btn.setActive = val => {
		let span = btn.querySelector(".gvs-filters-active");
		const resetIcon = btn.querySelector(".gvs-filter-unset-btn");
		const downIcon = btn.querySelector(".fa-chevron-down");
		if(val && !span) {
			span = document.createElement("span");
			span.classList.add("gvs-filters-active");
			const svg = btn.querySelector("svg");
			if(svg.nextSibling) { btn.insertBefore(span, svg.nextSibling); }
			else { btn.appendChild(span); }
			if(resetIcon) {
				resetIcon.style.display = null;
				downIcon.style.display = "none";
			}
		}
		else if(!val && span) {
			span.remove();
			if(resetIcon) {
				resetIcon.style.display = "none";
				downIcon.style.display = null;
			}
		}
	};
	return btn;
}

/**
 * Creates a new search bar
 * @param {string} id The bar ID
 * @param {string} placeholder The default label to display when search field is empty
 * @param {function} onInput Event handler for search text input (should return a Promise)
 * @param {function} onResultClick Event handler for result entry click
 * @param {Widgets} container The widgets container
 * @param {boolean} [nonClosingPanel] Should the search result closes other panels
 * @param {boolean} [reduced] Should the search bar be reduced by default ?
 * @param {Element} [preContent] DOM element to insert before search input
 * @returns {Element} The search bar
 * @private
 */
export function createSearchBar(
	id, placeholder, onInput, onResultClick,
	container, nonClosingPanel = false, reduced = false,
	preContent = null,
) {
	// Container
	const bar = document.createElement("div");
	bar.classList.add("gvs-widget-bg", "gvs-search-bar");
	bar.id = id;
	if(reduced) { bar.classList.add("gvs-search-bar-reducable"); }

	// Pre-content
	if(preContent) {
		bar.appendChild(preContent);
	}

	// Input field
	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = placeholder;
	input.id = `${id}-input`;
	input.setAttribute("autocomplete", "off");
	bar.appendChild(input);
	const extendInput = () => {
		bar.classList.remove("gvs-search-bar-reduced");
	};
	const reduceInput = () => {
		bar.classList.add("gvs-search-bar-reduced");
	};
	if(reduced) { reduceInput(); }

	// Status icon
	const icon = document.createElement("span");
	icon.classList.add("gvs-search-bar-icon");
	const iconSearch = fa(faMagnifyingGlass);
	const iconLoading = fa(faCircleNotch, { classes: ["fa-spin"] });
	const iconEmpty = fa(faXmark);
	const iconWarn = fa(faCircleExclamation);
	icon.appendChild(iconSearch);
	bar.appendChild(icon);

	// List of results
	const list = createPanel(container, bar, [], ["gvs-search-bar-results"], nonClosingPanel);
	bar.appendChild(list);

	// Change status icon
	const switchIcon = newStatusIcon => {
		icon.innerHTML = "";
		icon.appendChild(newStatusIcon);
	};

	// Reset search bar
	const resetSearch = () => {
		if(bar._throttler) { clearTimeout(bar._throttler); }
		input.value = "";
		list.innerHTML = "";
		list._toggle(false);
		delete bar._lastSearch;
		switchIcon(iconSearch);
		onResultClick(null);
		if(reduced) { reduceInput(); }
	};
	bar.resetSearch = resetSearch;

	// Handle result item click
	input.goItem = (entry) => {
		if(reduced) {
			onResultClick(entry);
			resetSearch();
		}
		else {
			if(bar._throttler) { clearTimeout(bar._throttler); }
			input.value = entry.title;
			list.innerHTML = "";
			list._toggle(false);
			switchIcon(iconEmpty);
			onResultClick(entry);
		}
	};

	// Force item selection
	input.setItem = (text) => {
		if(bar._throttler) { clearTimeout(bar._throttler); }
		input.value = text;
		list.innerHTML = "";
		list._toggle(false);
		switchIcon(iconEmpty);
		if(reduced) { extendInput(); }
	};

	// Handle search
	const goSearch = () => {
		if(bar._throttler) { clearTimeout(bar._throttler); }

		if(input.value.length === 0) {
			list.innerHTML = "";
			list._toggle(false);
			return;
		}

		bar._throttler = setTimeout(() => {
			list.innerHTML = "";
			list._toggle(false);
			switchIcon(iconLoading);

			onInput(input.value).then(data => {
				switchIcon(iconEmpty);
				list._toggle(true);

				if(!data || data.length == 0) {
					list.innerHTML = `<div class="gvs-search-empty">${container._t.gvs.search_empty}</li>`;
					return;
				}
				else if(data === true) {
					list._toggle(false);
					return;
				}

				data.forEach(entry => {
					const listEntry = document.createElement("div");
					listEntry.classList.add("gvs-search-bar-result");
					listEntry.innerHTML = `${entry.title}<br /><small>${entry?.subtitle || ""}</small>`;
					list.appendChild(listEntry);
					listEntry.addEventListener("click", () => input.goItem(entry));
				});
			}).catch(e => {
				console.error(e);
				switchIcon(iconWarn);
			});
		}, 250);
	};

	input.addEventListener("change", goSearch);
	input.addEventListener("keypress", goSearch);
	input.addEventListener("paste", goSearch);
	input.addEventListener("input", goSearch);
	icon.addEventListener("click", () => {
		if(icon.firstChild == iconEmpty || icon.firstChild == iconWarn) {
			resetSearch();
		}
		if(reduced && icon.firstChild == iconSearch) {
			if(!bar.classList.contains("gvs-search-bar-reduced")) { reduceInput(); }
			else { extendInput(); }
		}
	});

	return bar;
}

/**
 * Creates a panel associated to a button
 * @param {Widgets} container The widgets container
 * @param {Element} btn The component to associate to
 * @param {Element[]} [elements] DOM elements to append into
 * @param {str[]} [classes] CSS classes to add
 * @param {boolean} [nonClosingPanel] Should this panel closes other when opened
 * @returns {Element} The created panel
 * @private
 */
export function createPanel(container, btn, elements = [], classes = [], nonClosingPanel = false) {
	const panel = document.createElement("div");
	panel.id = btn.id + "-panel";
	if(Array.isArray(classes)) {
		classes = classes.filter(c => c != null && c.length > 0);
	}
	panel.classList.add("gvs-panel", "gvs-widget-bg", "gvs-hidden", ...classes);
	for(let e of elements) {
		panel.appendChild(e);
	}

	const togglePanel = (e, visible) => {
		if(e) { e.stopPropagation(); }
		if(visible === true) { panel.classList.remove("gvs-hidden"); }
		else if(visible === false) { panel.classList.add("gvs-hidden"); }
		else {
			panel.classList.toggle("gvs-hidden");
			visible = !panel.classList.contains("gvs-hidden");
		}

		// Hide all other panels
		if(visible && !nonClosingPanel) {
			closeOtherPanels(panel, container._viewer.container);
		}
	};
	panel._toggle = v => togglePanel(null, v);

	if(btn.tagName == "BUTTON") {
		btn.addEventListener("click", togglePanel);
		btn.addEventListener("hover", togglePanel);
	}

	return panel;
}

/**
 * Makes all previously opened panels closed if clicked outside of one.
 * @param {Element} target The DOM element which has been clicked
 * @param {Element} container The viewer container
 * @private
 */
export function closeOtherPanels(target, container) {
	const isPanel = p => (
		p.classList.contains("gvs-panel")
		|| p.classList.contains("gvs-search-bar-result")
		|| p.classList.contains("gvs-search-empty")
		|| p.classList.contains("gvs-search-bar-reducable")
	);

	// Find nearest panel
	if(!isPanel(target) && target?.parentNode) {
		target = target.parentNode;
		while(target instanceof Element) {
			if(isPanel(target)) { break; }
			else { target = target.parentNode; }
		}
	}

	// Click outside of open panel = closing
	for(const p of container.getElementsByClassName("gvs-panel")) {
		if(p != target && !p.contains(target) && !p.classList.contains("gvs-hidden")) {
			p.classList.add("gvs-hidden");
		}
	}
	for(const p of container.getElementsByClassName("gvs-search-bar-reducable")) {
		if(p != target && !p.contains(target) && !p.classList.contains("gvs-search-bar-reduced")) {
			p.resetSearch();
		}
	}
}

/**
 * Creates a new group of elements, already styled
 * @param {str} id 
 * @param {str} position (format: component-corner, with component = main/mini, and corner = top-left, top-right, top, bottom-left, bottom, bottom-right)
 * @param {Element[]} [elements] The children elements to add
 * @param {str[]} [classes] The CSS classes to add
 * @returns {Element} The created group
 * @private
 */
export function createGroup(id, position, container, elements = [], classes = []) {
	const group = document.createElement("div");
	group.id = id;
	if(Array.isArray(classes)) {
		classes = classes.filter(c => c != null && c.length > 0);
	}
	group.classList.add("gvs-group", ...classes);
	for(let e of elements) {
		group.appendChild(e);
	}
	container._corners[position].appendChild(group);
	return group;
}

/**
 * Make all buttons with data-copy=* or data-input=* attributes able to copy to clipboard.
 * 
 * @param {Element} container The parent container
 * @param {object} t The translation container
 * @private
 */
export function enableCopyButton(container, t) {
	for(let btn of container.getElementsByTagName("button")) {
		const field = btn.getAttribute("data-input");
		const copy = btn.getAttribute("data-copy");
		if(field || copy) {
			btn.addEventListener("click", () => {
				let text;
				if(field) {
					const inputField = document.getElementById(field);
					text = inputField.innerText || inputField.value;
				}
				else if(copy) {
					text = btn.getAttribute("data-copy");
				}
				navigator.clipboard.writeText(text);
				const btnOrigContent = btn.innerHTML;
				btn.innerHTML = `${t.gvs.copied} ${fat(faCheck)}`;
				btn.classList.add("gvs-btn-active");
				setTimeout(() => {
					btn.innerHTML = btnOrigContent;
					btn.classList.remove("gvs-btn-active");
				}, 2000);
			});
		}
	}
}

/**
 * Make a button usable
 * @param {Element} btn
 * @private 
 */
export function enableButton(btn) {
	btn.removeAttribute("disabled");
}

/**
 * Make a button unusable
 * @param {Element} btn
 * @private
 */
export function disableButton(btn) {
	btn.setAttribute("disabled", "");
}

/**
 * Transform Font Awesome icon definition into HTML element
 * @param {IconDefinition} i The icon to use
 * @param {object} [o] [FontAwesome icon parameters](https://origin.fontawesome.com/docs/apis/javascript/methods#icon-icondefinition-params)
 * @returns {Element} HTML element
 * @private
 */
export function fa(i, o) {
	return icon(i, o).node[0];
}

/**
 * Transform Font Awesome icon definition into HTML text
 * @param {IconDefinition} i The icon to use
 * @param {object} [o] [FontAwesome icon parameters](https://origin.fontawesome.com/docs/apis/javascript/methods#icon-icondefinition-params)
 * @returns {string} HTML element as text
 * @private
 */
export function fat(i, o) {
	return icon(i, o).html[0];
}

/**
 * Table cell with a copy link
 * @private
 */
export function createLinkCell(id, url, title, buttonTitle) {
	const link = document.createElement("a");
	link.href = url;
	link.target = "_blank";
	link.title = title;
	link.textContent = id;

	const buttonContainer = createButtonSpan(`${fat(faCopy)} ${buttonTitle}`, id);
	return [link, buttonContainer];
}

/**
 * Create a light table
 * @private 
 */
export function createTable(className, rows) {
	const table = document.createElement("table");
	table.className = className;

	rows.forEach(({ section, value, values, classes }) => {
		const tr = document.createElement("tr");
		const th = document.createElement("th");
		th.scope = "row";
		th.textContent = section;
		tr.appendChild(th);

		const td = document.createElement("td");
		if(classes) { td.classList.add(...classes); }
		if(values) { values.forEach(v => td.appendChild(v)); }
		else if(value instanceof HTMLElement) { td.appendChild(value); }
		else { td.innerHTML = value; }
		tr.appendChild(td);

		table.appendChild(tr);
	});

	return table;
}

/**
 * Create block header
 * @private
 */
export function createHeader(tag, innerHTML) {
	const header = document.createElement(tag);
	header.innerHTML = innerHTML;
	return header;
}

/**
 * Create copy to clipboard button
 * @private
 */
export function createButtonSpan(innerHTML, dataCopy = null) {
	const button = document.createElement("button");
	button.innerHTML = innerHTML;
	if (dataCopy) button.setAttribute("data-copy", dataCopy);

	const span = document.createElement("span");
	span.className = "gvs-input-btn";
	span.appendChild(button);

	return span;
}

/**
 * Create an input label
 * @private
 */
export function createLabel(forAttr, text, faIcon = null) {
	const label = document.createElement("label");
	label.htmlFor = forAttr;
	if(faIcon) { label.appendChild(fa(faIcon)); }
	label.appendChild(document.createTextNode(text));
	return label;
}

/**
 * Show a grade in a nice, user-friendly way
 * @param {number} grade The obtained grade
 * @returns {string} Nice to display grade display
 * @private
 */
export function showGrade(grade, t) {
	let label = "<span class=\"gvs-grade\">";

	for(let i=1; i <= grade; i++) {
		label += fat(faStar);
	}
	for(let i=grade+1; i <= 5; i++) {
		label += fat(farStar);
	}
	
	label += "</span> (";
	if(grade === null) { label += t.gvs.metadata_quality_missing+")"; }
	else { label += grade + "/5)"; }
	return label;
}

/**
 * Displays a nice QualityScore
 * @param {number} grade The 1 to 5 grade
 * @returns {Element} The HTML code for showing the grade
 * @private
 */
export function showQualityScore(grade) {
	const span = document.createElement("span");

	for(let i=1; i <= QUALITYSCORE_VALUES.length; i++) {
		const pv = QUALITYSCORE_VALUES[i-1];
		const sub = document.createElement("span");
		sub.appendChild(document.createTextNode(pv.label));
		sub.classList.add("gvs-qualityscore");
		sub.style.backgroundColor = pv.color;
		if(i === (6-grade)) {
			sub.classList.add("gvs-qualityscore-selected");
		}
		span.appendChild(sub);
	}

	return span;
}