/**
 * Zoot "toy diorama" MapLibre style on OpenFreeMap vector tiles (OpenMapTiles schema).
 * Free, no key. Matthew's lane: tweak colours here, not in components.
 */
const PALETTES = {
  // Zoot day: cream ground, white-to-yellow buildings (taller = more yellow), ink-outlined roads.
  day: {
    ground: '#fff6cf', residential: '#fff3c4', commercial: '#ffefb3', industrial: '#f3ecd0',
    grass: '#dfe9a6', wood: '#cbdd8e', sand: '#ffe9a8', park: '#d7e79c',
    water: '#9fdcf0', waterLine: '#d3f1fa', aeroway: '#efe8cb', runway: '#dcd3ab',
    roadMajor: '#ffffff', roadMinor: '#ffffff', roadCasing: '#3a3526', path: '#d9b84a', rail: '#111111',
    b0: '#ffffff', b1: '#fff4c2', b2: '#ffe680', b3: '#ffcc00', bOpacity: 0.9,
    label: '#111111', labelHalo: '#ffffff',
    sky: { 'sky-color': '#ffe680', 'horizon-color': '#fff4c2', 'fog-color': '#fff4c2', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.25, 'atmosphere-blend': 0.2 }
  },
  // Zoot night: black city, yellow arterials and lit-up towers.
  night: {
    ground: '#151515', residential: '#191919', commercial: '#1d1d1d', industrial: '#171717',
    grass: '#1f2a14', wood: '#1a2511', sand: '#2a2614', park: '#222e16',
    water: '#0c2b3b', waterLine: '#14506b', aeroway: '#202020', runway: '#303030',
    roadMajor: '#d9ad00', roadMinor: '#3d3d3d', roadCasing: '#000000', path: '#5a4c14', rail: '#8c8c8c',
    b0: '#2b2b2b', b1: '#3a3a3a', b2: '#6a5a10', b3: '#ffcc00', bOpacity: 0.9,
    label: '#fff4c2', labelHalo: '#111111',
    sky: { 'sky-color': '#0a0a0a', 'horizon-color': '#3a3000', 'fog-color': '#1a1600', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.3, 'atmosphere-blend': 0.15 }
  }
}

const name = ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name']]

export function questStyle({ dark = false } = {}) {
  const c = dark ? PALETTES.night : PALETTES.day
  return {
    version: 8,
    name: 'Zoot Toy City',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© OpenStreetMap contributors · OpenFreeMap' }
    },
    sky: c.sky,
    light: { anchor: 'map', color: '#ffffff', intensity: dark ? 0.25 : 0.38, position: [1.3, 215, 35] },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': c.ground } },
      {
        id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse',
        paint: {
          'fill-color': ['match', ['get', 'class'], ['residential', 'suburb', 'neighbourhood'], c.residential, ['commercial', 'retail'], c.commercial, ['industrial', 'railway'], c.industrial, c.residential],
          'fill-opacity': 0.8
        }
      },
      {
        id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover',
        paint: { 'fill-color': ['match', ['get', 'class'], 'wood', c.wood, 'sand', c.sand, c.grass], 'fill-opacity': 0.9 }
      },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': c.park, 'fill-opacity': 0.85 } },
      { id: 'aeroway-area', type: 'fill', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': c.aeroway } },
      {
        id: 'aeroway-runway', type: 'line', source: 'omt', 'source-layer': 'aeroway', filter: ['all', ['==', ['geometry-type'], 'LineString'], ['in', ['get', 'class'], ['literal', ['runway', 'taxiway']]]],
        paint: { 'line-color': c.runway, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 2, 16, 40] }
      },
      { id: 'water-glow', type: 'line', source: 'omt', 'source-layer': 'water', paint: { 'line-color': c.waterLine, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 17, 6], 'line-blur': 2 } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': c.water } },
      { id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': c.water, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 17, 5] } },
      {
        id: 'road-casing', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], ['!=', ['get', 'brunnel'], 'tunnel']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.roadCasing, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 2, 17, 22] }
      },
      {
        id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['all', ['in', ['get', 'class'], ['literal', ['minor', 'service']]], ['!=', ['get', 'brunnel'], 'tunnel']], minzoom: 13,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.roadMinor, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0.8, 17, 9], 'line-opacity': 0.95 }
      },
      {
        id: 'road-path', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['path', 'track']]], minzoom: 15,
        paint: { 'line-color': c.path, 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 1, 18, 3], 'line-dasharray': [2, 1.5] }
      },
      {
        id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['all', ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]], ['!=', ['get', 'brunnel'], 'tunnel']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.roadMajor, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, 1, 17, 16] }
      },
      {
        id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation',
        filter: ['all', ['in', ['get', 'class'], ['literal', ['rail', 'transit']]], ['!=', ['get', 'brunnel'], 'tunnel']],
        paint: { 'line-color': c.rail, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1, 17, 4], 'line-dasharray': [3, 2] }
      },
      {
        id: 'buildings-3d', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14.5,
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, c.b0, 30, c.b1, 90, c.b2, 200, c.b3],
          // Toy-city heights: √h × 4 turns a 250 m tower into ~63 m so the skyline stays toy-like.
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14.5, 0, 15.2, ['*', ['sqrt', ['coalesce', ['get', 'render_height'], 8]], 4]],
          'fill-extrusion-base': ['*', ['sqrt', ['coalesce', ['get', 'render_min_height'], 0]], 4],
          'fill-extrusion-opacity': c.bOpacity,
          'fill-extrusion-vertical-gradient': true
        }
      },
      {
        id: 'place-labels', type: 'symbol', source: 'omt', 'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['suburb', 'quarter', 'neighbourhood', 'city', 'island']]],
        layout: {
          'text-field': name, 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 11, 11, 16, 15],
          'text-transform': 'uppercase', 'text-letter-spacing': 0.12, 'text-max-width': 8
        },
        paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 2, 'text-opacity': 0.85 }
      },
      {
        id: 'road-labels', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 16,
        filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary']]],
        layout: { 'symbol-placement': 'line', 'text-field': name, 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
        paint: { 'text-color': c.label, 'text-halo-color': c.labelHalo, 'text-halo-width': 1.5, 'text-opacity': 0.7 }
      }
    ]
  }
}
