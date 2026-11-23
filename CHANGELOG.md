# 变更记录

## 1.1.0 — 2026-11-23

### 新增

- **文本能力榜**页签：38 个模型的文本总分、理解、输出，行可展开 8 个评分维度。数据取 Modeldial 页面自身使用的官方快照 JSON（`reference.modeldial.com`），名次按上游规则（总分降序、同分按 model id）在 Host 端重排，不依赖快照里的行序。
- **Harness 榜**页签：23 个 harness 本体的综合分、稳定完成率、时间效率、成本效率，行可展开 8 个能力域。
- 新接口 `GET /__modeldial/writing`、`GET /__modeldial/harness`（都支持 `?force=1`）。
- 数据落盘：每个源最后一次成功的数据原子写到 `${DSH_HOME:-~/.dsh}/cache/modeldial-leaderboard/`，重启后先读盘，面板不再空白等上游。
- 上游支持 ETag 的源（文本榜）走 `if-none-match` 重新验证，304 只刷新时间戳。
- 网络错误与 502-504 重试一次（退避 800ms），错误按「超时 / 网络 / HTTP / 解析」分类。
- 测试（`node --test`）：四个解析器、四个路由、缓存与落盘/重启、客户端七个页签渲染冒烟；另有 GitHub Actions 跑 `npm run check` + `npm test`。
- `scripts/refresh-fixtures.mjs`：从上游重新裁剪 `test/fixtures/`。

### 变更

- 页签从 5 个变 7 个：编程榜单 / 文本能力榜 / Harness 榜 / 订阅额度 / 性价比 / 按模型 / 按预算。
- 页头 KPI 按当前榜实算（文本榜显示模型数与评测批次日期，Harness 榜显示本体数与能力域数）。
- 抽出三张榜共用的排序状态与表头组件；编程榜的列、默认排序、前三名折叠行为不变。
- 额度源 URL 去掉无作用的 `provider=Google` 调试参数。
- `package.json` 补 `repository` / `homepage` / `bugs` / `keywords` / `engines` / `scripts`，版本升到 1.1.0。

### 修复

- 文本榜快照里新模型追加在末尾，直接按行序显示会把 93.84 分的模型排到第 32 名；现在按总分重排。

## 1.0.0 — 2026-11-22

首个版本：编程榜单、订阅额度、性价比、按模型、按预算五个页签；SSR HTML 解析、内存缓存、失败时保留上次数据、USD/CNY 折算。
