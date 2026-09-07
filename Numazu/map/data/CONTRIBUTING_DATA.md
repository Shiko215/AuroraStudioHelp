UI 支援繁中／简中／EN／日本語（左上角切換）。資料可用 `name` / `name_ja` / `name_en`，popup 會跟語系顯示。

# 人手怎麼補資料（含 Editor GUI）

## 最快：用地圖右下角 Editor GUI

### 畫路線（圖像化）
1. 模式選「畫路線折線」
2. 填代號／名稱／顏色／是否 WIP
3. 在地圖上連續點頂點（至少 2 點）
4. 「完成路線」→ 「下載 routes.geojson」覆蓋 `data/routes.geojson`
5. 「撤銷頂點」刪最後一點；「撤銷上一個新增」刪整條剛完成的線

---
## 最快：用地圖右下角 Editor GUI（站／地標）

1. `python -m http.server 8080` 開啟地圖
2. 右下角選「新增地標」或「新增巴士站」
3. 填名稱／category／備註／路線
4. **點地圖**放置
5. 按「下載 pois.geojson / stations.geojson」
6. 用下載檔覆蓋 `data/` 裡同名檔（或請有權限的人 PR）

界線（boundary）暫用手改 `boundary.geojson` 多邊形頂點。

---

# 人手怎麼補 BusStop／地標／界線

不要改程式也能補資料。只動 `data/` 裡的 GeoJSON。

## 檔案分工

| 檔案 | 放什麼 |
|---|---|
| `stations.geojson` | 巴士站（對應遊戲站／TTData） |
| `routes.geojson` | 路線折線（N12／N13…） |
| `pois.geojson` | 餐廳、動漫景點、加油站、總站、其他備註 |
| `boundary.geojson` | **地圖界線**（強調可玩範圍） |

## 通用欄位

每個點／線的 `properties`：

```json
{
  "id": "唯一英文蛇形 id",
  "name": "顯示名稱（可中日英）",
  "name_en": "optional",
  "category": "見下方",
  "note": "人手備註，給玩家／支援看的",
  "routes": ["N12", "Cho11"],
  "zone": "Numazu Port",
  "wip": false,
  "source": "manual | omsi | survey",
  "verified": false
}
```

### `category`（pois 用）

- `bus_stop` — 若站只寫在 pois 也可，但建議站放 stations
- `restaurant` — 餐廳／市場飲食
- `anime_landmark` — 動漫／實景打卡
- `gas` — 加油站
- `terminal` — 總站／車庫／轉運
- `scenic` — 風景
- `other`

### 座標

GeoJSON 順序是 **`[經度, 緯度]`**（lng, lat），不是 lat,lng。  
可在地圖右鍵／手機取得後填入。

## 補巴士站流程（推薦）

1. 遊戲或實地確認站名
2. 在 OSM／Google 找到位置 → 複製 lat/lng
3. 複製 `stations.geojson` 裡一筆 Feature，改 `id`／`name`／`coordinates`／`routes`／`note`
4. 存檔，重整 http://localhost:8080/

之後可做「從 `Busstops.cfg` 半自動匯出」；人手欄位（`note`／景點）永遠留在 GeoJSON。

## 補地標

編輯 `pois.geojson`，設好 `category` + `note`。  
地圖上會依類別變色，可用圖層開關。

## 強調地圖界線

編輯 `boundary.geojson` 的 Polygon 座標（順時針或逆時針一圈，首尾同一點）。  
畫面上是粗青框 + 淡填色，預設開啟。

## 注意

- 用 UTF-8 存檔
- JSON 最後一筆後面不要多逗號
- 先 `python -m http.server` 再開瀏覽器，不要 `file://`
