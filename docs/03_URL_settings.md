# URL settings

Various settings could be set from URL hash part in order to create permalinks.

These are set after the `#` symbol of the URL, following a `key=value` format, each being separated by `&` symbol.

Example:

```urlencoded
https://panoramax.xyz/#map=19.51/48.1204522/-1.7199004&pic=890b6268-7716-4e34-ada9-69985e6c1657
```

## :fontawesome-solid-computer: Interface settings

### :material-target: `focus`: main shown element

Switch to choose which element between map, picture or metadata should be shown wide at start. Examples:

- `focus=map`
- `focus=pic`
- `focus=meta`

By default, picture is shown wide.

### :simple-speedtest: `speed`: sequence play speed

The duration of stay on a picture during sequence play (excluding image dowloading time), in milliseconds. Authorized values are between 0 and 3000. Example:

```urlencoded
speed=1000
```

### :lock: `nav`: allowed navigation between pictures

Choose the allowed navigation between pictures, to eventually restrict what is visible from first shown picture. Values are:

- `nav=any` (or no value): no restriction in navigation (default)
- `nav=seq`: can only see pictures in same sequence
- `nav=none`: can only see current picture, no navigation to other picture allowed

!!! note

	This parameter is intended to work on page first load. If used after page load, you may switch to another picture or fully reload pictures metadata cache in order to have expected behaviour.

## :material-image: Picture settings

### :material-barcode: `pic`: picture ID

The currently selected picture ID. Example:

```urlencoded
pic=890b6268-7716-4e34-ada9-69985e6c1657
```

### :material-arrow-all: `xyz`: picture position

The shown position in picture, following this format:

```
x/y/z
```

With:

- `x`: the heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
- `y`: top/bottom position in degrees (-90 = bottom, 0 = front, 90 = top)
- `z`: zoom level (0 = minimum/wide view, 100 = maximum/full zoom)

Example:

```urlencoded
xyz=10/25/50
```

## :map: Map settings

### :fontawesome-solid-location-dot: `map`: map position and visibility

The `map` parameters handles both map visibility and position. It can take different values:

- `map=none`: to completely disable the map.
- `map=zoom/latitude/longitude`: for setting the map position (following [MapLibre GL JS hash format](https://maplibre.org/maplibre-gl-js-docs/api/map/#map-parameters)). It updates automatically when map is moved.
- no parameter set: shows the map of the whole world, or zoomed on instance area of interest.

Example:

```urlencoded
map=19.51/48.1204522/-1.7199004
```

!!! note

	The `map=none` is intended to work __on page first load only__. Changing it dynamically will not hide the map, and will be reset on next map movement.

### :date: `date_from` and `date_to`: filter map data by date

Minimum and maximum capture date for pictures and sequences to show on map (if map is enabled), in ISO format:

```urlencoded
date_from=2020-01-01&date_to=2023-12-31
```

### :material-rotate-360: `pic_type`: filter map data by picture type

The type of picture (360° or classic) to show on map (if map is enabled). Examples:

- `pic_type=flat` for classic pictures
- `pic_type=equirectangular` for 360° pictures
- Not set for showing both

### :camera: `camera`: filter map data by camera make and model

The camera make and model to filter shown pictures and sequences on map (if map is enabled). A fuzzy search is used to filter on map, but your string _should_ always start with camera make. Examples:

- `camera=gopro` will display all pictures taken with any _GoPro_ camera
- `camera=gopro%20max` will only show pictures taken with a _GoPro Max_ camera
- `camera=max` will not shown any picture on map, as it doesn't match any camera make

### :medal: `pic_score`: filter map data by quality score

The pictures quality level wanted for map display (if map is enabled). Values are `A`, `B`, `C`, `D`, `E` and can be used that way:

- `pic_score=A` for only best pictures
- `pic_score=ABC` for A, B or C-grade pictures


### :material-format-paint: `theme`: map colouring for pictures and sequences

The map theme to use for displaying pictures and sequences (if map is enabled). Available themes are:

- `theme=default` (or no setting defined): single color for display (no classification)
- `theme=age`: color based on picture/sequence age (red = recent, yellow = 2+ years old)
- `theme=type`: color based on camera type (orange = classic, green = 360°)
- `theme=score`: color based on quality score (green = best quality, yellow = worst)

### :material-nature-people: `background`: map background

The map background to display (if map is enabled, and raster background configured). Available values are:

- `background=streets` (or no setting defined): classic streets map
- `background=aerial`: aerial imagery (only if raster background available)

### :fontawesome-solid-user: `users`: filter map data by username

This parameter filters pictures and sequences shown on map to only keep those of concerned users. Each user is defined by its UUID (not username). List is comma-separated. Example:

```urlencoded
users=abcdefgh-1234-5678-9012-abcdefgh12345678,dcf0d3be-0418-4b71-9315-0ff8a2f86a0b
```
