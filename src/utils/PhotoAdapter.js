import { EquirectangularTilesAdapter } from "@photo-sphere-viewer/equirectangular-tiles-adapter";

/**
 * Override of PSV EquirectangularTilesAdapter for fine-tweaking.
 * @private
 */
export default class PhotoAdapter extends EquirectangularTilesAdapter {
	constructor(viewer, config) {
		super(viewer, config);
		this._shouldGoFast = config.shouldGoFast || (() => true);
	}

	/**
	 * Override to skip loading SD images according to shouldGoFast option.
	 */
	loadTexture(panorama, loader) {
		if(!panorama.origBaseUrl) { panorama.origBaseUrl = panorama.baseUrl; }
		else { panorama.baseUrl = panorama.origBaseUrl; }
		
		// Fast mode + thumbnail available + no HD image loaded yet + flat picture
		if(
			this._shouldGoFast()
			&& panorama.thumbUrl
			&& !panorama.hdLoaded
			&& panorama.rows == 1
		) {
			panorama.baseUrl = panorama.thumbUrl;
		}

		return super.loadTexture(panorama, loader).then(data => {
			if(panorama.baseUrl === panorama.origBaseUrl) {
				panorama.hdLoaded = true;
			}
			return data;
		});
	}

	/**
	 * Override to skip loading tiles according to shouldGoFast option.
	 * @private
	 */
	__loadTiles(tiles) {
		if(!this._shouldGoFast()) { super.__loadTiles(tiles); }
	}
}
