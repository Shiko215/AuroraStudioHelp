# Project Numazu Online Map v0.4

Leaflet 網頁地圖：OSM／衛星、站、地標、路線、地圖界線、**Editor GUI**、**繁中／简中／EN／日本語**。

## 預覽

```powershell
cd Numazu/map
python -m http.server 8080
```

開 http://localhost:8080/ 後 Ctrl+F5。

## Editor

- 地標／巴士站：選模式 → 填表 → 點地圖 → 下載 GeoJSON
- 路線：選「畫路線」→ 連續點頂點 → 完成 → 下載 `routes.geojson`
- 語系：左上角按鈕（會記在 localStorage）

資料說明見 `data/CONTRIBUTING_DATA.md`。
