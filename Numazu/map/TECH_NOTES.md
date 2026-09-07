# TCTMAP 技術消化筆記

來源：https://trueking.hk/TCTMAP

## 核心

1. **Leaflet** 地圖引擎
2. **`L.CRS.Simple`**：虛構世界平面座標，不是 lat/lng
3. **座標轉換**：northing/easting 減固定偏移（600000+157500 / 600000+187150）對到 map 平面
4. **Tiles**：`tiles/{grid}/{folder}/{z}/{x}/{y}.webp`，`tileSize: 512`，`zoomOffset: 9`，minZoom -9
5. **SVG `imageOverlay`**：國土／標籤／鐵道／行政等大圖疊加
6. **Pane z-index**：底圖 pane 410、overlay pane 450
7. **Layer control**：底圖（TCT／OMSI）+ 多個 overlay 開關
8. **Bus stops**：fetch GitHub raw JSON，轉座標後 marker
9. **Export**：localhost 才開，把可見 SVG 畫到 canvas 輸出 JPG

## 沼津為何先不用 CRS.Simple

Project Numazu 是真實沼津 1:1，玩家與創作者需要對真實地理。v0.1 用 WGS84+OSM 最快對齊；若之後要「遊戲還原美術底圖」，再加一層自訂 tiles（可學 TCTMAP 的 grid tile + overlay 做法）。
