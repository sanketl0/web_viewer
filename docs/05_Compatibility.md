# Compatibility with STAC API

Panoramax viewer works best with a [Panoramax API](https://gitlab.com/panoramax/server/api), but is designed to be compatible with a wide range of [STAC API](https://github.com/radiantearth/stac-api-spec). Although, third-party STAC API needs the following requirements to work with our viewer:

- Collections corresponding to pictures sequences, and items corresponding to individual pictures
- Offer a `/search` endpoint ([documentation](https://github.com/radiantearth/stac-api-spec/tree/main/item-search))
- Picture items should have required metadata documented below.
- Offer a vector tiles endpoint for map display, either with:
    - A [MapLibre Style JSON](https://maplibre.org/maplibre-style-spec/) file, advertised through landing page (`/api`) with a `xyz-style` link.
    - A direct tiles URL, pointing to tiles in [MVT format](https://mapbox.github.io/vector-tile-spec/) and following layer structure described below. It must be advertised in landing page (`/api`) using [Web Map Links](https://github.com/stac-extensions/web-map-links) STAC extension (as `xyz` link).

Optional metadata could also be supplied by third-party STAC API to improve viewer usability:

- In landing page (`/api` route, corresponding to main STAC Catalog):
    - An `extent` property ([following this format](https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#extent-object)) could be provided to make map zoom in available data area by default.
    - A `collection-preview` link pointing to a formatted URL (like `https://yourserver.fr/api/collections/{id}/thumb.jpg`) which is a direct link to a thumbnail image to represent a specific sequence.
    - A `item-preview` link pointing to a formatted URL (like `http://localhost:5000/api/pictures/{id}/thumb.jpg`) which is a direct link to a thumbnail image for a given picture.
    - A `data` link with `application/rss+xml` media type pointing to a RSS feed of recently uploaded collections. Given link may also support a `bbox` query string parameter to filter collections by their location.
    - Links `user-xyz` (MVT media type) and `user-search` (JSON media type) to allow filtering by user.
    - A `report` link with `application/json` media type to allow posting pictures reports.
    - A `title` property for showing proper API name in viewer debug.


## Perspective imagery metadata

Pictures metadata follow [STAC item specification](https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md), plus some extensions:

- _Perspective imagery specification_ for its pictures and sequences metadata ([documentation](https://github.com/stac-extensions/perspective-imagery))
- _Tiled assets specification_ for smooth display of high-resolution pictures ([documentation](https://github.com/stac-extensions/tiled-assets))

Viewer relies on following item metadata for display:

- `assets`
    - [`roles`](https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md#asset-roles): `data`, `visual` and `thumbnail`
    - `type`: `image/jpeg` or `image/webp`
    - `href`
  - `assets_templates`
      - `tiles`
          - `role`: `data`
          - `href`
- `geometry`
- `collection`
- `id`
- `links`
    - [`rel`](https://github.com/radiantearth/stac-spec/blob/master/item-spec/item-spec.md#link-object): `prev`, `next`, `related`
    - `type`: `application/geo+json`
    - `id`
    - `geometry`
    - `datetime`
- `properties`
    - `pers:interior_orientation`
        - `field_of_view`
        - `focal_length`
    - `view:azimuth`
    - `pers:roll`
    - `pers:pitch`
    - `datetime` or `datetimetz`
    - `tiles:tile_matrix_sets`
        - `geovisio`
            - `type`: `TileMatrixSetType`
            - `tileMatrix`
                - `matrixHeight`
                - `matrixWidth`
                - `tileHeight`
                - `tileWidth`


## Vector tiles format

MVT Vector tiles must contain at least two layers : sequences and pictures.

Layer _sequences_:

- Available on all zoom levels
- Available properties: `id` (sequence ID)

Layer _pictures_:

- Available on zoom levels >= 15
- Available properties: `id` (picture ID), `ts` (picture date/time), `heading` (picture heading in degrees)

A supplementary layer _grid_ can be made available for low-zoom overview:

- Available on zoom levels < 6
- Available properties: `id` (grid cell ID), `nb_pictures` (amount of pictures), `coef` (value from 0 to 1, relative quantity of available pictures)
- Optional properties: `nb_360_pictures`, `coef_360_pictures`, `nb_flat_pictures`, `coef_flat_pictures` (similar to `nb_pictures` and `coef` but separated by picture type)

### Labels translation

If your vector tiles support multiple languages, you can set in your `style.json` the list of supported languages :

```json
{
    "metadata": {
        "panoramax:locales": ["fr", "en", "latin"]
    }
}
```

The viewer will try to find the best matching `name:LANG` property according to user browser settings.
