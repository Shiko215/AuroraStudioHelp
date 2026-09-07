/* Project Numazu Online Map v0.4 — route draw + multilingual UI */
window.numazuLang = localStorage.getItem('numazu_map_lang') || 'zh';

const NUMZU_CENTER = [35.085, 138.88];
const NUMZU_ZOOM = 12;

const map = L.map('map', { zoomControl: true, minZoom: 10, maxZoom: 18 }).setView(NUMZU_CENTER, NUMZU_ZOOM);
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap | Project Numazu Online Map v0.4 (Aurora Studio)'
});
const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: 'Tiles &copy; Esri | Project Numazu Online Map v0.4'
});
osm.addTo(map);

const boundaryLayer = L.layerGroup().addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const stationLayer = L.layerGroup().addTo(map);
const wipLayer = L.layerGroup().addTo(map);
const poiLayer = L.layerGroup().addTo(map);
const draftLayer = L.layerGroup().addTo(map);

let stationsFC = null, poisFC = null, routesFC = null;
const undoStack = [];
let draft = { latlngs: [], markers: [], line: null };
let layerControl = null;

function t(key) { return window.numazuT(key); }
function displayName(props) { return window.numazuDisplayName(props); }

function stationIcon(isWip) {
  return L.divIcon({ className: '', html: `<div class="station-dot${isWip ? ' wip' : ''}"></div>`, iconSize: [12, 12], iconAnchor: [6, 6], popupAnchor: [0, -8] });
}
function poiIcon(category) {
  return L.divIcon({ className: '', html: `<div class="poi-dot poi-${category || 'other'}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8] });
}
async function loadGeoJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}
function popupHtml(props, kind) {
  const routes = (props.routes || []).join(', ') || '—';
  const wip = props.wip ? '<div class="wip-tag">WIP</div>' : '';
  const note = props.note ? `<div style="margin-top:6px">${props.note}</div>` : '';
  const cat = props.category ? `<div class="zone">${props.category}</div>` : '';
  const zone = props.zone ? `<div class="zone">${props.zone} · ${routes}</div>` : `<div class="zone">${routes}</div>`;
  return `<strong>${displayName(props) || kind}</strong>${cat}${zone}${wip}${note}`;
}
function parseRoutes(text) { return String(text || '').split(',').map(s => s.trim()).filter(Boolean); }
function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/geo+json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function stripLayer(feat) {
  const { _leafletLayer, ...rest } = feat;
  return { type: 'Feature', properties: { ...rest.properties }, geometry: rest.geometry };
}
function addMarkerForFeature(feat, kind) {
  const [lng, lat] = feat.geometry.coordinates;
  const latlng = L.latLng(lat, lng);
  let layer;
  if (kind === 'station') {
    layer = L.marker(latlng, { icon: stationIcon(!!feat.properties.wip) });
    layer.bindPopup(() => popupHtml(feat.properties, 'Stop'));
    if (feat.properties.wip) wipLayer.addLayer(layer); else stationLayer.addLayer(layer);
  } else {
    layer = L.marker(latlng, { icon: poiIcon(feat.properties.category) });
    layer.bindPopup(() => popupHtml(feat.properties, 'POI'));
    poiLayer.addLayer(layer);
  }
  feat._leafletLayer = layer;
  return layer;
}
function addRouteFeature(feat) {
  const coords = feat.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const layer = L.polyline(coords, {
    color: feat.properties.color || '#334155',
    weight: feat.properties.wip ? 4 : 5,
    opacity: 0.9,
    dashArray: feat.properties.wip ? '8 8' : null
  });
  layer.bindPopup(() => `<strong>${displayName(feat.properties) || feat.properties.id}</strong>${feat.properties.wip ? '<div class="wip-tag">WIP</div>' : ''}`);
  if (feat.properties.wip) wipLayer.addLayer(layer); else routeLayer.addLayer(layer);
  feat._leafletLayer = layer;
  return layer;
}
function clearDraft() { draftLayer.clearLayers(); draft = { latlngs: [], markers: [], line: null }; }
function redrawDraft() {
  draftLayer.clearLayers();
  draft.markers = [];
  draft.latlngs.forEach((ll) => {
    const m = L.circleMarker(ll, { radius: 5, color: '#fff', weight: 2, fillColor: '#0891b2', fillOpacity: 1 });
    draft.markers.push(m); draftLayer.addLayer(m);
  });
  if (draft.latlngs.length >= 2) {
    draft.line = L.polyline(draft.latlngs, { color: document.getElementById('route-color').value, weight: 4, dashArray: '4 6' });
    draftLayer.addLayer(draft.line);
  } else draft.line = null;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (el.tagName === 'OPTION' || el.tagName === 'BUTTON' || el.tagName === 'LABEL' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'A' || el.tagName === 'P' || el.tagName === 'SPAN') {
      el.textContent = val;
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll('#lang-row .lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === window.numazuLang);
  });
  document.documentElement.lang = ({ zh: 'zh-Hant', zh_cn: 'zh-Hans', en: 'en', ja: 'ja' })[window.numazuLang] || 'zh-Hant';
  // rebuild layer control labels
  if (layerControl) {
    map.removeControl(layerControl);
  }
  layerControl = L.control.layers(
    { 'OpenStreetMap': osm, 'Satellite': satellite },
    {
      [t('layer_boundary')]: boundaryLayer,
      [t('layer_routes')]: routeLayer,
      [t('layer_stops')]: stationLayer,
      [t('layer_wip')]: wipLayer,
      [t('layer_pois')]: poiLayer,
      [t('layer_draft')]: draftLayer
    },
    { collapsed: false, position: 'topright' }
  ).addTo(map);
}

async function boot() {
  const [stations, routes, pois, boundary] = await Promise.all([
    loadGeoJSON('data/stations.geojson'),
    loadGeoJSON('data/routes.geojson'),
    loadGeoJSON('data/pois.geojson'),
    loadGeoJSON('data/boundary.geojson')
  ]);
  stationsFC = stations; poisFC = pois; routesFC = routes;

  L.geoJSON(boundary, {
    style: { color: '#0891b2', weight: 4, opacity: 1, fillColor: '#22d3ee', fillOpacity: 0.08, dashArray: '2 10' },
    onEachFeature: (feat, layer) => {
      const p = feat.properties || {};
      layer.bindPopup(() => `<strong>${displayName(p) || p.name || 'Boundary'}</strong><div class="zone">${p.note || ''}</div>`);
      boundaryLayer.addLayer(layer);
    }
  });
  routes.features.forEach(addRouteFeature);
  stations.features.forEach(f => addMarkerForFeature(f, 'station'));
  pois.features.forEach(f => addMarkerForFeature(f, 'poi'));
  L.control.scale({ metric: true, imperial: false }).addTo(map);
  applyI18n();
  wireEditor();
  wireLang();
}

function wireLang() {
  document.querySelectorAll('#lang-row .lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.numazuLang = btn.dataset.lang;
      localStorage.setItem('numazu_map_lang', window.numazuLang);
      applyI18n();
    });
  });
}

function wireEditor() {
  const modeEl = document.getElementById('edit-mode');
  const pointFields = document.getElementById('point-fields');
  const routeFields = document.getElementById('route-fields');
  const routeActions = document.getElementById('route-actions');
  const catEl = document.getElementById('edit-category');
  const nameEl = document.getElementById('edit-name');
  const noteEl = document.getElementById('edit-note');
  const routesEl = document.getElementById('edit-routes');

  function syncModeUI() {
    const mode = modeEl.value;
    document.body.classList.toggle('editor-on', mode !== 'off');
    const isRoute = mode === 'route';
    pointFields.hidden = isRoute;
    routeFields.hidden = !isRoute;
    routeActions.hidden = !isRoute;
    if (!isRoute) clearDraft();
  }
  modeEl.addEventListener('change', syncModeUI);
  syncModeUI();

  map.on('click', (e) => {
    const mode = modeEl.value;
    if (mode === 'off') return;
    if (mode === 'route') {
      draft.latlngs.push(e.latlng);
      redrawDraft();
      return;
    }
    const name = nameEl.value.trim() || (mode === 'station' ? t('new_stop') : t('new_poi'));
    const note = noteEl.value.trim();
    const routes = parseRoutes(routesEl.value);
    const category = catEl.value;
    const id = `${mode}_${Date.now()}`;
    const feat = {
      type: 'Feature',
      properties: { id, name, note, routes, source: 'editor_gui', verified: false },
      geometry: { type: 'Point', coordinates: [Number(e.latlng.lng.toFixed(6)), Number(e.latlng.lat.toFixed(6))] }
    };
    if (mode === 'station') {
      feat.properties.zone = 'Local'; feat.properties.wip = false;
      stationsFC.features.push(feat); addMarkerForFeature(feat, 'station');
      undoStack.push({ kind: 'station', feat });
    } else {
      feat.properties.category = category;
      poisFC.features.push(feat); addMarkerForFeature(feat, 'poi');
      undoStack.push({ kind: 'poi', feat });
    }
  });

  document.getElementById('btn-undo-vertex').onclick = () => {
    if (!draft.latlngs.length) return;
    draft.latlngs.pop(); redrawDraft();
  };
  document.getElementById('btn-finish-route').onclick = () => {
    if (draft.latlngs.length < 2) { alert(t('need_two_points')); return; }
    const id = (document.getElementById('route-id').value.trim() || `R${Date.now()}`);
    const name = document.getElementById('route-name').value.trim() || id;
    const color = document.getElementById('route-color').value || '#2563eb';
    const wip = document.getElementById('route-wip').checked;
    const feat = {
      type: 'Feature',
      properties: { id, name, color, wip, source: 'editor_gui' },
      geometry: { type: 'LineString', coordinates: draft.latlngs.map(ll => [Number(ll.lng.toFixed(6)), Number(ll.lat.toFixed(6))]) }
    };
    routesFC.features.push(feat); addRouteFeature(feat);
    undoStack.push({ kind: 'route', feat });
    clearDraft();
  };
  document.getElementById('btn-download-pois').onclick = () => downloadJSON('pois.geojson', { type: 'FeatureCollection', name: poisFC.name || 'pois', features: poisFC.features.map(stripLayer) });
  document.getElementById('btn-download-stations').onclick = () => downloadJSON('stations.geojson', { type: 'FeatureCollection', name: stationsFC.name || 'stations', features: stationsFC.features.map(stripLayer) });
  document.getElementById('btn-download-routes').onclick = () => downloadJSON('routes.geojson', { type: 'FeatureCollection', name: routesFC.name || 'routes', features: routesFC.features.map(stripLayer) });
  document.getElementById('btn-undo').onclick = () => {
    const last = undoStack.pop();
    if (!last) return;
    const arr = last.kind === 'station' ? stationsFC.features : last.kind === 'poi' ? poisFC.features : routesFC.features;
    const idx = arr.indexOf(last.feat);
    if (idx >= 0) arr.splice(idx, 1);
    if (last.feat._leafletLayer) {
      stationLayer.removeLayer(last.feat._leafletLayer);
      poiLayer.removeLayer(last.feat._leafletLayer);
      wipLayer.removeLayer(last.feat._leafletLayer);
      routeLayer.removeLayer(last.feat._leafletLayer);
    }
  };
  document.getElementById('route-color').addEventListener('input', () => { if (draft.latlngs.length >= 2) redrawDraft(); });
}

boot().catch((err) => {
  console.error(err);
  alert(t('load_fail') + '\n' + err.message);
});
