# Notion 匯入模板說明

這兩個 CSV 可直接匯入 Notion，建立新的 database：

- `notion_channels_template.csv`
- `notion_videos_template.csv`

建議匯入方式：

1. 在 Notion 新建頁面
2. 選擇 `Import`
3. 匯入對應 CSV
4. 匯入完成後，手動把欄位型別調整成下列設定

---

## 頻道庫（Channels）

對應檔案：

- `notion_channels_template.csv`

欄位型別應調整為：

| 欄位名稱 | Notion 型別 |
|---|---|
| Name | Title |
| URL | URL |
| Handle | Text |
| Channel ID | Text |
| Status | Select |
| Type | Select |

建議 `Status` 選項至少包含：

- `準備拿取頻道ID`
- `準備爬蟲`
- `爬蟲完成`

---

## 影片庫（Videos）

對應檔案：

- `notion_videos_template.csv`

欄位型別應調整為：

| 欄位名稱 | Notion 型別 |
|---|---|
| Name | Title |
| Video ID | Text |
| URL | URL |
| Channel ID | Text |
| Status | Select |
| Views | Number |
| Likes | Number |
| Comments | Number |
| Duration | Text |
| Type | Select |
| Published At | Date |
| Thumbnail | URL |
| Tags | Text |
| Description | Text |

建議 `Status` 選項至少包含：

- `準備爬蟲`
- `爬蟲完成`

---

## 很重要

建立完成後，請記得把你的 Notion Integration 分享到這兩個 database：

1. 打開 database
2. 點 `Share`
3. 邀請你的 integration

若沒有分享權限，程式同步時仍然會失敗。
