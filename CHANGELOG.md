# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Before _2.0.0_, Viewer was embed in the [API repository](https://gitlab.com/panoramax/server/api), this changelog only includes features since the split. Older details are present in [API Changelog](https://gitlab.com/panoramax/server/api/-/blob/develop/CHANGELOG.md).

## [Unreleased]

## [3.2.3] - 2025-02-10

### Added
- In viewer, when map is expanded, a double-click somewhere else than a picture makes previous picture unselected. Viewer can also be programmatically called to unselect a picture.

### Changed

- In Viewer, when popup metadata is showing up, a click on _Back_ web browser button closes it.
- Non-blocking error messages (slow map loading) have a nice-looking button for dismiss.
- Map loader dismisses after 75% of map background and Panoramax tiles are actually loaded.
- In viewer, when no picture is selected at start and map is focused, placeholder image is not shown anymore.

### Fixed

- In Editor, long sequences were not showing up at all.
- In viewer, if JOSM live edit was failing, some picture loading events were not fully removed.

## [3.2.2] - 2025-01-06

### Added

- A new documentation popup is integrated in viewer for a summary of Quality Score.
- A visual indicator shows if a map theme is selected in viewer.

### Changed

- Edited the quality score grades to put 360° action cameras in B-rating, lowered resolution value to be A-rated.
- In viewer, _Filter_ button offers a reset ❌ icon to remove all enabled filters (showing when at least one is enabled).
- In viewer filters, 360/flat picture buttons are disabled by default.
- On images, `alt` attribute for accessibility is always set.
- A nicer UI makes more comprehensible that some map filters in viewer are only available at high-zoom levels.

### Fixed

- Prevent map rotation and pitch change through touch gestures.

## [3.2.1] - 2024-12-05

### Added

- New languages: 🇮🇹 Italian, 🇵🇱 Polish, 🇩🇰 Danish, 🗺️ Esperanto

### Changed

- Support the newly released [STAC API 1.1](https://cloudnativegeo.org/blog/2024/09/stac-1.1.0-released/) (and all the next 1.x versions)

## [3.2.0] - 2024-11-20

### Added
- In map filters, shortcuts to set date filter to latest month or year are now available. A visual indicator also shows if a filter is active or not when widget is collapsed.
- In viewer, picture metadata popup can be closed using _Escape_ key.
- Viewer map filters has now a shortcut to select your own pictures.

### Changed
- In map filters widget, selected filters show up in blue.
- Improve readability of cities labels on map for default style.
- We don't use the _Yaw_ value for display if no _Pitch_ & _Roll_ values are defined, to avoid orientation issues with pictures where _PoseHeadingDegrees_ was used instead of _GPSImgDirection_.
- In viewer, when picture is reduced, no virtual tour arrows are shown.
- In viewer, different statistics are shown for grid layer if API offer distinct values for 360° and classic pictures based on map filters.
- In viewer, if no thumbnail is found for grid preview, popup hides instead of showing a message.
- Viewer short links use `;` separator instead of `|` for better display in various applications. The older links are not supported anymore.

### Fixed
- Map was not loading if style file didn't contain `metadata` property.
- A 360° vertically cropped panorama without tiles available was not shown properly.
- Option `lang` was not applied to basemap.
- If cookies were not allowed at all, Internet connection speed test was breaking the viewer. Now, if it can't run, we consider Internet speed as slow.

## [3.1.1] - 2024-10-16

### Added
- 💯 __Quality Score__ is now available ! It shows a rating of picture quality based on its resolution and GPS accuracy. This is made available through different part of Web Viewer: as a map theme, in map filters, and in picture metadata popup. __Note__ that it only works with compatible API.
- Streets background supports translations (if offered in vector tiles).
- Viewer search bar supports search by picture UUID.
- Simple display of available/unavailable API features in browser console.

### Changed
- Better rendering of cities names in streets background (for default vector tiles).
- Viewer page link offered in _Share_ widget is a short link, for simpler URL sharing. Example:
  - Shortened URL: `https://panoramax.xyz/#s=fp|s2|pb829b21a-f733-45f7-ba7d-2d28405e6a5c|c58.48/-1.91/30|m17/48.12237/-1.663654|bs`
  - Full URL: `https://panoramax.xyz/#background=streets&focus=pic&map=17/48.12237/-1.663654&pic=b829b21a-f733-45f7-ba7d-2d28405e6a5c&speed=200&xyz=58.48/-1.91/30`
- Updated MapLibre GL JS to 4.7.1, PMTiles to 3.2.0, Photo Sphere Viewer to 5.11.0 (leading to a major performance improvement for display of flat pictures)
- Full support of browser's back/next buttons, even with _Alt + Right/Left Arrow_ shortcuts when picture is maximized.

### Fixed
- Cropped panorama with 360° field of view were not using tiles.

## [3.1.0] - 2024-10-03

⚠️ Library has been renamed on NPM into `@panoramax/web-viewer`, you are invited to change your dependencies to keep track of new updates. Also, default import `GeoVisio` has been renamed into `Panoramax`, so you have to update your code as well.

### Added
- Support for 🇨🇳 traditionnal Chinese language (`zh_Hant`) thanks to [Kevin32950](https://gitlab.com/kevinlin18)
- Support for 🇩🇪 German language (`de`) thanks to [Bastian Greshake Tzovaras](https://gitlab.com/gedankenstuecke)
- Support for 🇪🇸 Spanish language (`es`) thanks to Daniel Callejas Sevilla
- Viewer new option `iframeBaseURL` which allows to change the start of URL given in "Website integration" code from _Share_ widget.
- Viewer new option `picturesNavigation` to eventually restrict possible navigation in photo (limit to same sequence or only current picture). Also manageable through `nav` URL hash parameter.
- An automatic geolocate button added to the address search bar for showing user's position based on GPS on map.
- Form to send reports about pictures (blur issues, copyright infringement...) against compatible API. This is available in Viewer, click on bottom-right corner legend of a picture, then "Report picture" in metadata popup.
- In browser console, API information is shown: title, endpoint URL, STAC and GeoVisio versions.
- Clicking on browser's back button makes viewer go to previously shown picture. Note that browser shortcut _Alt + Right/Left Arrow_ only works if map is maximized ([related issue](https://gitlab.com/panoramax/clients/web-viewer/-/issues/161)).

### Changed
- **Library has been renamed to `Panoramax`** and moved on NPM to `@panoramax/web-viewer` package.
- Proper support for picture yaw correction (from `Xmp.GPano.PoseHeadingDegrees, Xmp.Camera.Yaw, Exif.MpfInfo.MPFYawAngle` EXIF tags). This replaces the past behaviour of viewer using `GPSImgDirection` as yaw value. A picture can now have a different GPS direction (corresponding to capture direction, geographically speaking) and a yaw correction (relative to camera). This means that **PSV getPosition** and similar functions doesn't return GPS heading value in X, but yaw correction. GPS heading is available through `viewer.psv.getPictureOriginalHeading` function. Functions `getXY` and `getXYZ` stay unchanged in their behaviour (X value is GPS heading).
- When viewer is loaded inside through an iframe, a lot less widgets are shown for better usability.
- URL hash parameter `map` can also take a `none` value on first page load to disable viewer map.
- Viewer popup now has a close button in its top-right corner.
- Transition between two flat pictures keeps image position and zoom if current view is inside visible image.
- When a fast enough Internet connection is available (more than 10 MBit/s), flat pictures are loaded in HD instead of SD definition.
- EXIF tags table in viewer is now sorted alphabetically.
- URL hash doesn't update until viewer is fully loaded (to avoid broken URL in the while).
- Button to edit in OSM iD editor directly opens current viewer image.
- Update of Photo Sphere Viewer to 5.10 (for yaw/pitch/roll fix).
- Some error messages are dismissable.
- Proper handling of search by coordinates (done in viewer instead of calling geocoder API).

### Fixed
- `selectedPicture` parameter for Viewer was not taken into account at load and blocking everything.
- Editor orientation change preview was not showing coherent links, they are now removed.
- Picture orientation symbol where not shown correctly when switching from specific user to general tiles.
- Sphere correction values were inverted (reported by [Peter Bremer](https://gitlab.com/peter1972)).
- Click on certain elements of a widget panel could close it unexpectedly.
- Date filter fields were too large on mobile.
- Proper support of _cropped panoramas_.
- JS class names are hard-coded to avoid issues with Webpack/bundled environments.
- Viewer event `psv:view-rotated` was giving incorrect `x` value when moving around.

## [3.0.2] - 2024-06-26

### Added
- Metadata for pitch & roll correction are read and used for picture display.
- Develop version can be tested at [viewer.geovisio.fr](https://viewer.geovisio.fr/).
- Mkdocs is now used to generate documentation.
- A warning alerts you when map should be zoomed more for filters to be visible.
- Legend is reduced by default on mobile, and can be shown on a single click.

### Changed
- Doc and links changed following Gitlab organization renaming from GeoVisio to Panoramax.
- Map markers are showing picture type and orientation even before clicking on it.
- Arrows to change current picture are using are using images instead of 3D model and can't render outside of view.
- Picture legend (author and date) can be click as a whole instead of just _i_ button.
- Better handling of multiple picture IDs passed in URL, as well as picture not found in API errors.
- Skip picture transition animation if playing sequence at high-speed.
- Search bar is showing up as a reduced button on mobile.
- Mini-map is reduced by default on mobile.

### Fixed
- Partially translated language had "undefined" labels showing when no translation was available.
- `xyz` URL parameter was not correctly restored on initial load.
- Restore user name in filter widget on page reload.

## [3.0.1] - 2024-05-02

### Fixed

- `reloadVectorTiles` function was not working for specific user tiles.
- RSS link in Viewer _Share_ menu was not embedding map bounding box.
- Fetch options were not always sent to MapLibre calls.
- Pictures & sequences colouring was not correct at first load.
- The label "hidden to public" was not showing up correctly on Standalone Map.

## [3.0.0] - 2024-04-30

⚠️ This release introduces __many breaking changes__, make sure to update your code to follow new namings and function calls.

### Added
- A new `Editor` view is available, for previewing changes applied to a sequence or picture.
- In viewer, popup for picture metadata has _Copy to clipboard_ buttons for sequence and picture IDs.
- Viewer supports printing, either through browser menus (or Ctrl+P) or through _Share_ widget.
- Viewer GPS precision quality also takes in account EXIF tag `GPSHPositioningError`.

### Changed
- Source code was __widely refactored__. The new logic is:
  - `Map` and `Photo` are designated as _components_, basic bricks which can be embed elsewhere.
  - `Viewer`, `StandaloneMap` and `Editor` are designated as _views_, which embed either Map, Photo or both. They also add custom logic beyond common behaviour of components.
  - Utilitary functions are moved into various files or `utils` folder.
- Usage doc was improved, with more links and events associated to their respective classes.
- Many functions previously in `Viewer` class have moved to _components_:
  - Moved to `components/Photo`: `getXY, getXYZ, getPictureMetadata, getPictureRelativeHeading, goToNextPicture, goToPrevPicture, goToPosition, clearPictureMetadataCache, setPictureHigherContrast (renamed setHigherContrast), setXYZ, getTransitionDuration, setTransitionDuration`
  - Moved to `components/Map`: `reloadVectorTiles, getMapBackground (renamed getBackground), getVisibleUsers, switchVisibleUsers (renamed setVisibleUsers)`
  - Moved to `components/CoreView`: `isSmall (renamed isWidthSmall)`
- Some events were renamed:

| Old event name | New event name |
| -------------- | -------------- |
| `map-background-changed` | `map:background-changed` |
| `users-changed` | `map:users-changed` |
| `hover` | `map:sequence-hover` |
| `picture-loading` | `psv:picture-loading` |
| `picture-loaded` | `psv:picture-loaded` |
| `picture-preview-started` | `psv:picture-preview-started` |
| `picture-preview-stopped` | `psv:picture-preview-stopped` |
| `view-rotated` | `psv:view-rotated` |
| `picture-tiles-loaded` | `psv:picture-tiles-loaded` |
| `transition-duration-changed` | `psv:transition-duration-changed` |

- In Viewer, double click on reduced widget makes it wide.
- Demo page has been reworked, to show all available views.
- Sequences are easier to click on.
- Viewer metadata popup displays capture date timezone.
- Improved display of author name if `Author` EXIF tag is set and similar to user account name.
- EXIF table in viewer metadata popup is collapsed by default.
- Size of JS bundle reduced (removed or replaced some images, selective FontAwesome imports).
- Option `style` in viewer has moved to top-level properties (instead of being under `map.style`).
- Viewer image loading times improved by showing lower resolution if playing at high speed, or if map is expanded.
- Photo component function `setTransitionDuration` expects a minimal value of 100 instead of 0.
- Labels from vector tiles are always shown on top of other layers, including STAC API ones.

### Removed
- Option `picturesTiles` is removed in favor of advertised `xyz` link from STAC API.
- `Viewer` functions `getMap` and `getPhotoViewer`, in favor of direct properties `map` and `psv`.
- `Viewer` function `goToPicture`, in favor of `select` function.

### Fixed
- Popup wasn't opening if a picture didn't have a heading value set.
- Date filter fields were overflowing in certain cases.
- Viewer popup was not showing correct value for _GPS dilution of precision_ if value was a fraction (`10/2`).


## [2.5.1] - 2024-03-08

### Fixed
- Some map filters where broken due to picture zoom level change from 2.5.0


## [2.5.0] - 2024-03-07

### Changed
- In map rendering, pictures exact position are shown from zoom level 15 (instead of 14) to reduce size of vector tiles.


## [2.4.2] - 2024-03-05

### Fixed
- Sequence and picture thumbnail popup was not showing/hiding smoothly due to delay introduced in past version.
- If hash option was disabled, viewer was not loading properly.


## [2.4.1] - 2024-03-05

### Added
- Picture metadata are visible in a popup, accessible through picture legend ("_i_" button). It displays summarized information, as well as all EXIF and XMP tags available.
- A new method in Viewer named `getPictureRelativeHeading` allow to get information about relative heading of camera compared to vehicle movement.
- A new method in Viewer named `clearPictureMetadataCache` allows to force refresh the metadata of all loaded pictures and map display of selected picture (if any). Useful when a picture or a sequence has changed on server-side after first load.
- A new event `broken` can be fired by Viewer in case of initial loading error.

### Changed
- Improved styling of _Share_ panel (better contrast, more icons)
- Updated Maplibre GL to 3.6.2, PMTiles to 2.11.0, Photo Sphere Viewer to 5.7.0
- Improved display of place search results (geocoding) by using either returned bounding box (Nominatim) or place type (BAN) for a more precise map positioning
- Improved performance of thumbnail display


## [2.4.0] - 2024-01-31

### Added
- Viewer can be filtered to only display data from a single user. This can be done through user interface, or through parameters (`users`).

### Removed
- In standalone map, `setFilters` is dropped in favor of `users` parameter passed in constructor.
- In viewer, `setFilters` doesn't support `user` parameter anymore, in favor of `switchVisibleUsers` and `getVisibleUsers` methods and `users` constructor parameter.


## [2.3.1] - 2024-01-18

### Added
- Support of [PMTiles](https://docs.protomaps.com/pmtiles/) as vector tile input data. They have to be declared in your MapLibre style JSON, using a prefixed URL (like `pmtiles://https://example.com/example.pmtiles`). [PMTiles docs](https://docs.protomaps.com/pmtiles/maplibre) can help you.
- A second map background (for aerial imagery) can be defined, in complement of current streets map rendering. This is done through the `map.raster` parameter, using the [MapLibre raster source definition](https://maplibre.org/maplibre-style-spec/sources/#raster).

### Changed
- User interface reworked to improve readability and usability, both on desktop and mobile.
- Click on map at low zoom levels (where only sequence geometry is shown) better directs to nearby picture (instead of last one in sequence). Also, in thumbnail popup on mouse hover, a closer picture is shown.
- Default vector map background is showing worldwide data (instead of only France).

### Fixed
- Loader showed up when clicking on already selected picture on map.

### Removed
- Dependency to MapLibre GL Geocoder. Consequently, `geocoder` settings for viewer and map only uses parameter `engine` to choose between Nominatim and BAN geocoding service.


## [2.3.0] - 2023-11-27

### Added
- `StandaloneMap` supports now `reloadVectorTiles` function, in a similar fashion as classic viewer.
- Support of `rel=related` pictures links to travel to nearby, related sequences.
- Hover on nearby picture arrow in viewer shows picture location in map.
- 🇭🇺 Hungarian translation (thanks to [Balázs Meskó](https://gitlab.com/meskobalazs))

### Changed
- Nearby pictures arrows are shown with a color depending of their status (blue if in same sequence, orange if in a nearby sequence).
- Library _Photo Sphere Viewer_ updated to 5.5.0.


## [2.2.1] - 2023-10-30

### Added
- When multiple _producer_ names are associated to a picture, all are shown in details widget (instead of only first one).

### Changed
- In `StandaloneMap`, the `select` method also make a thumbnail visible on selected feature.
- The "Move around" widget is not shown when container height is too small.


## [2.2.0] - 2023-10-10

### Added
- A `destroy` function is now available to properly get rid of the viewer, which is useful for single-page applications.
- A new component named `StandaloneMap` is available to show a coverage map of pictures and sequences, without full picture display. It can be controlled programatically.

### Changed
- Calls to API are now using STAC standard notation for IDs lists (`ids=bla` instead of `ids=["bla"]`). Old notation was based on GeoVisio API misunderstanding of STAC docs. This __breaks compatibility__ with GeoVisio API <= 2.1.4, but makes viewer compatible with any STAC-compliant API.
- A new button in player advanced settings allows to augment image brightness & contrast (_☀️_ button).
- Mini map/viewer is now responsive, with a size increasing based on screen size.
- Photo Sphere Viewer updated to 5.4.3.

### Fixed
- Invalid map bounding box received from API was preventing viewer from loading. Now, a warning is shown instead in web console.


## [2.1.4] - 2023-09-05

### Added
- Custom widgets can be inserted in viewer through `widgets.customWidget` option.
- A `ready` event is launched by viewer when it has done all its first loading process.

### Changed
- Advanced examples of how to use the viewer are moved into a dedicated documentation named [04_Advanced_examples](./docs/04_Advanced_examples.md).

### Fixed
- Default `box-sizing` CSS property (overridden by some CSS frameworks) was breaking size of some widgets. This is now explicitly defined at top-level viewer `div`.
- Player widget could not init with pre-loaded image metadata due to empty CSS class string.
- If a STAC item was not having `roles` defined, code was failing.


## [2.1.3] - 2023-08-30

### Added
- A widget allows to change speed of sequence playing. It actually changes the duration of stay on a single picture on sequence playing. The speed can also be changed programmatically.
- Viewer displays a _RSS_ button in _Share_ panel to have a feed of recently uploaded sequences on visible map area. This is shown only if API landing page advertises RSS feed availability.
- In _Filters_ panel, the map color scheme can be changed to visually find sequences and pictures based on their capture "age" or camera type.
- Selected sequence is shown on map with a different color (blue).

### Changed
- In _Share_ panel, current page, RSS and HD image links are grouped into a _Links_ section, replacing the previous _Link to this page_ section.
- When applying filters, if map is at a zoom level < 7, it zooms automatically to zoom 7 to make applied filters having a visible effect on map data.
- Legend is also shown in mini map/picture component, not only on main component.
- JOSM link now only zoom on picture area (instead of zooming and downloading data) for smoother transitions. Also, zoomed area takes into account picture heading for better positioning.
- In a flat picture sequence, avoid picture viewer rotation if angle between two pictures is more than 1/8 of a circle (to avoid 🤢).
- Transitions in 360° sequences are fine-tuned according to relative orientation in viewer (fade effect and rotation only if looking in capture path direction).

### Fixed
- In _Filters_ panel, clicking on _Enter_ key was resetting all input fields.
- Thumbnails were not updating when mouse wasn't going out of pictures/sequences layer ([reported by Stéphane Peneau](https://gitlab.com/panoramax/clients/web-viewer/-/issues/40)).
- Map picture pointer was not pointing to correct direction during picture loading ([reported by Stéphane Peneau](https://gitlab.com/panoramax/clients/web-viewer/-/issues/39)).
- Map had an empty background if no vector tiles were available on some places, now a white background is always shown.


## [2.1.2] - 2023-08-20

### Added
- A new widget is available on map to filter shown pictures by date, type (flat/equirectangular) or camera. Pictures are filtered only on zoom levels >= 7 (due to availability of required metadata in vector tiles). Filters are also persisted in URL hash with new parameters (`date_from`, `date_to`, `pic_type`, `camera`).
- In "share" button, links to edit OpenStreetMap with iD and JOSM editors are now available. JOSM is automatically synced when a new picture is loaded. iD editor instance to use can be changed through `widgets.editIdUrl` Viewer parameter.
- Keyboard shortcuts are introduced for all actions in the viewer ([listed here](./docs/01_Start.md)).

### Changed
- Transition between pictures and sequences are perfectly synced ([thanks to Damien Sorel](https://github.com/mistic100/Photo-Sphere-Viewer/issues/1049)).


## [2.1.1] - 2023-08-01

### Added
- Meaningful error messages are displayed when possible (instead of generic message)
- A "share" button allows to get direct link to current viewer, and offers ready-to-paste iframe snippet

### Changed
- Buttons and widgets have coherent design and behaviour between map and photo viewer


## [2.1.0] - 2023-07-20

Empty release to follow the API's minor version

## [2.0.7] - 2023-07-10

### Added
- A new function `reloadVectorTiles` allows users to force full refresh of GeoVisio/STAC API tiles, for example to reflect backend changes done on sequences or pictures data.

### Changed
- Map is updated sooner to be more in sync when loading incoming picture

### Fixed
- Thumbnail of hidden sequences where not correctly shown


## [2.0.6] - 2023-06-30

### Added
- A `fetchOptions` parameter for Viewer allows to embed custom settings for internal `fetch` calls, for example to enable authenticated calls against API
- Hidden sequences or pictures for an user are shown on map if user is authenticated (rendered in a gray tone)
- A loader screen is shown while API, map and first picture loads. It also displays an user-friendly error message if necessary.

### Changed
- Transitions between flat pictures are smoother
- Arrows are more visible in zoom 0 to 70% for classic pictures


## [2.0.5] - 2023-06-09

### Changed
- Transition between pictures is lowered to 500ms

### Fixed
- Viewer was not showing vector tiles anymore for GeoVisio API <= 2.0.1


## [2.0.4] - 2023-06-08

### Changed
- Read sequence info from vector tiles if available

## [2.0.3] - 2023-06-08

### Changed
- Viewer calls API based on its advertised capabilities in its landing page, so many API calls are faster. This is particularly useful for __tiles URL__, which can be now determined based on API response, making it not necessary to define it on Viewer settings.
- Viewer `endpoint` parameter should now be a direct link to API landing page, instead of its search endpoint.

### Fixed
- Default image shown at start is better oriented


## [2.0.2] - 2023-06-05

### Added
- A download button is shown to get the HD picture currently shown by viewer.
- Version and git commit are shown at viewer start-up in web browser console.

### Changed
- Map maximum zoom is set by default to 24, but still can be changed through Viewer `options.map.maxZoom` parameter.
- Error message from viewer doesn't block using navbar


## [2.0.1] - 2023-05-26

### Added
- Support of translations of viewer labels. This is defined based on user browser preferences, or a `lang` setting that can be passed to Viewer. Available languages are English (`en`) and French (`fr`).

### Changed
- Updated Photo Sphere Viewer to 1.5.0, solves some low-quality display issues

### Fixed
- Label shown on small action button (bottom left corner) was showing [wrong label when map was hidden](https://gitlab.com/panoramax/clients/web-viewer/-/issues/16)


## [2.0.0] - 2023-04-27

### Added

- Publish a `geovisio@develop` viewer version on NPM for each commit on the `develop` branch. You can depend on this version if you like to live on the edge.
- Viewer displays the name of picture author, next to the picture date.
- Viewer offers a search bar to easily find a street or city on map. It can use either _Nominatim_ or _Base Adresse Nationale_ geocoders, as well as your own geocoder engine.
- A download button allows to download full-resolution image directly

### Changed

- Viewer dependencies have been updated :
  - Photo Sphere Viewer 5.1 (inducing __breaking changes__)
  - MapLibre 2.4
  - JS Library Boilerplate 2.7
- Viewer unit tests are covering a broader part of functionalities. To make this possible, Photo Sphere Viewer is differently associated to GeoVisio viewer (as a property `this.psv` instead of GeoVisio inheriting directly from PSV). Original PSV object is accessible through `getPhotoViewer` function.
- Linked to previous point, map and photo viewer are two distinct DOM elements in a main GeoVisio container. Many CSS classes have been changed, and `setMapWide` JS function renamed into `setFocus`.
- Improved rendering of flat, vertical images in viewer and thumbnail.
- Improved error messages for missing parameters in the Viewer initialization
- Viewer has a better rendering on small-screen devices

### Fixed

- Map couldn't be disabled due to an error with URL `hash` handling
- MapLibre was raising issues on built versions on NPM
- [A Photo Sphere Viewer under Chrome issue](https://github.com/mistic100/Photo-Sphere-Viewer/issues/937) was making classic pictures not visible


[Unreleased]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.2.3...develop
[3.2.3]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.2.2...3.2.3
[3.2.2]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.2.1...3.2.2
[3.2.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.2.0...3.2.1
[3.2.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.1.1...3.2.0
[3.1.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.1.0...3.1.1
[3.1.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.0.2...3.1.0
[3.0.2]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.0.1...3.0.2
[3.0.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/3.0.0...3.0.1
[3.0.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.5.1...3.0.0
[2.5.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.5.0...2.5.1
[2.5.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.4.2...2.5.0
[2.4.2]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.4.1...2.4.2
[2.4.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.4.0...2.4.1
[2.4.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.3.1...2.4.0
[2.3.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.3.0...2.3.1
[2.3.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.2.1...2.3.0
[2.2.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.2.0...2.2.1
[2.2.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.1.4...2.2.0
[2.1.4]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.1.3...2.1.4
[2.1.3]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.1.2...2.1.3
[2.1.2]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.1.1...2.1.2
[2.1.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.1.0...2.1.1
[2.1.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.7...2.1.0
[2.0.7]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.6...2.0.7
[2.0.6]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.5...2.0.6
[2.0.5]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.4...2.0.5
[2.0.4]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.3...2.0.4
[2.0.3]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.2...2.0.3
[2.0.2]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.1...2.0.2
[2.0.1]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/2.0.0...2.0.1
[2.0.0]: https://gitlab.com/panoramax/clients/web-viewer/-/compare/1.5.0...2.0.0
