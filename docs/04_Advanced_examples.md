# Advanced examples

On this page, you will discover many examples on how to do practical things, like changing the map tiles, or adding custom buttons.

## Change map background style

The viewer can be configured to use a different map background than the default one. By default, an OpenStreetMap France classic style if offered. Changing the style is done by passing a `style` parameter on viewer setup. It should follow the [MapLibre Style specification](https://maplibre.org/maplibre-style-spec) and be passed as an object, or an URL to such style:

```js
var viewer = new Panoramax.Viewer(
	"viewer",
	"https://my-panoramax-server.net/api",
	{
		style: "https://my.tiles.provider/basic.json",
		map: { startWide: true }
	}
);
```

Note that the viewer also support PMTiles (for a simpler tile hosting), so your style file can contain vector source defined like this:

```json
{
  "sources": {
    "protomaps": {
        "type": "vector",
        "url": "pmtiles://https://example.com/example.pmtiles",
    }
  }
}
```

If you need to customize the received JSON style for compatibility issues, this can be done by passing an object instead of a string. Here is an example based on IGN map styling, which needs some parameter to be changed:

```js
fetch("https://wxs.ign.fr/essentiels/static/vectorTiles/styles/PLAN.IGN/standard.json")
.then(res => res.json())
.then(style => {
  // Patch tms scheme to xyz to make it compatible for Maplibre GL JS
  style.sources.plan_ign.scheme = 'xyz';
  style.sources.plan_ign.attribution = 'Données cartographiques : © IGN';

  var viewer = new Panoramax.Viewer(
    "viewer",
    "https://my-panoramax-server.net/api",
    {
	  style,
      map: { startWide: true }
    }
  );
});
```

## Adding aerial imagery

In complement of classic _streets_ rendering, you can add an aerial imagery as map background. This is possible using a WMS or WMTS service, and setting configuration as following (this example uses the French IGN aerial imagery):

```js
var viewer = new Panoramax.Viewer(
	"viewer",
	"https://my-panoramax-server.net/api",
	{
		map: {
			startWide: true,
			raster: {
				type: "raster",
				tiles: [
					"https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM_0_21&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}"
				],
				minzoom: 0,
				maxzoom: 21,
				attribution: "&copy; IGN",
				tileSize: 256
			}
		}
	}
);
```

## Use another geocoder

The map offers a search bar for easily locating places based on user text search. This is handled by [MapLibre GL Geocoder](https://github.com/maplibre/maplibre-gl-geocoder). By default, the viewer uses [Nominatim](https://nominatim.org/) API, which provides geocoding using OpenStreetMap data.

You can switch to using another geocoder though, we also directly offer the [Base adresse nationale](https://adresse.data.gouv.fr/) API (French authority geocoder) that you can use like this:

```js
var viewer = new Panoramax.Viewer(
	"viewer",
	"https://my-panoramax-server.net/api",
	{
		map: {
			geocoder: { engine: "ban" }
		}
	}
);
```

And you can also define your own custom geocoder using these options:

```js
var myOwnGeocoder = function(config) {
	// Call your API
	// Config parameter is based on geocoderApi.forwardGeocode.config structure
	// Described here : https://github.com/maplibre/maplibre-gl-geocoder/blob/main/API.md#setgeocoderapi

	// It returns a promise resolving on a Carmen GeoJSON FeatureCollection
	// Format is described here : https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object
}

var viewer = new Panoramax.Viewer(
	"viewer",
	"https://my-panoramax-server.net/api",
	{
		map: {
			geocoder: { geocoderApi: {
				forwardGeocode: myOwnGeocoder
			} }
		}
	}
);
```

## Authentication against API

If the STAC API you're using needs some kind of authentication, you can pass it through Web Viewer options. Parameter `fetchOptions` allows you to set custom parameters for the [JS fetch function](https://developer.mozilla.org/en-US/docs/Web/API/fetch#parameters), like the `credentials` setting. For example:

```js
var viewer = new Panoramax.Viewer(
	"viewer",
	"https://your-secured-stac.fr/api",
	{
		fetchOptions: {
			credentials: "include"
		}
	}
);
```

## Add custom buttons

The viewer allows you to add a custom widget, placed just over the _Share_ button (bottom-right corner). It can be defined through `widgets.customWidget` option. Here's an example to add a simple link:

```js
var viewer = new Panoramax.Viewer(
	"viewer",
	"https://my-panoramax-server.net/api",
	{
		widgets: {
			customWidget: `<a
				href="https://my-amazing-page.net/"
				class="gvs-btn gvs-widget-bg gvs-btn-large"
				title="Go to an amazing page">🤩</a>`
		},
	}
);
```

You can also pass more complex DOM elements:

```js
var myWidget = document.createElement("div");
myWidget.innerHTML = "...";

var viewer = new Panoramax.Viewer(
	"viewer",
	"https://my-panoramax-server.net/api",
	{
		widgets: { customWidget: myWidget }
	}
);
```


## Coverage map synced with external component

Let's say you want to list all sequences of an user. You can display a standalone map which can be synced with your custom list.

```js
var map = new Panoramax.StandaloneMap(
	"map",
	"https://panoramax.ign.fr/api",
	{
		// Optional, to allow filtering by user
		users: ["79b851b4-232a-4c96-ac1b-b6cf693c77ae"]
	}
);

// Change visible map area
map.fitBounds([west, south, east, north]);

// Listen to user clicks on map
map.addEventListener("select", e => {
	console.log("Selected sequence", e.detail.seqId, "picture", e.detail.picId);
});

// Listen to sequence hovered on map
map.addEventListener("hover", e => {
	console.log("Hovered sequence", e.detail.seqId);
});

// You can also programatically change selection on map
map.select(
	"c463d190-06b0-47fb-98a8-b4a775a39ad6", // A sequence ID
	"bdea1eb4-4496-46da-a4d5-b22b16e75fa8"  // A picture ID (can be null if unknown)
);
```


## Clean-up in Single Page Application

If you're running the viewer in a Single Page Application (SPA) and want to get rid of it, you must destroy properly the component before changing view. This allows the viewer to properly remove all its event listeners and free memory.

```js
viewer.destroy();
delete viewer;
```
