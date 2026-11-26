# 变更记录

## 1.2.0 — 2026-11-26

### 新增

- **真实用量**页签（第 8 个页签）：接入上游 `https://modeldial.com/trends` 与新路由 `GET /__modeldial/trends`（15 分钟 TTL、磁盘落盘与 `?force=1`），展示核心对照摘要、厂商「API 支出 vs Token 用量」双柱对比、OpenRouter 近 14 日 Token 占比、Vercel 近 30 日支出占比与 28 日留存态势。
- **订阅可用额度联动**：在「真实用量」表中交叉匹配订阅目录，每行直观标出该模型的最高月均可用亿 Token、收录套餐数与起步月费（随 USD/CNY 同步换算），支持「可订阅」一键筛选与按最高月额度排序；展开行明细可查看每个套餐的月费与月均 Token 额度，并一键跳至「按模型」页签细看。
- 新增 `test/fixtures/trends.html` 及对应解析器、路由和客户端渲染单元测试；`scripts/refresh-fixtures.mjs` 与 `scripts/preview.mjs` 同步支持 `trends`。

## 1.1.1 — 2026-11-23

### 视觉打磨（文本能力榜 / Harness 榜）

- 行尾展开从下划线蓝字换成次级灰的「展开维度 + 细箭头」按钮，悬停 / 展开时才上强调色；操作列锁到 74px，展开不推表。
- 维度明细固定 4 列，8 项落成 4+4；文字理解与文字输出之间加一条通栏发丝线；面板窄于 780px 时按容器宽度降 2 列。
- 展开行去掉中间发丝线、铺 wash、排名挂强调色，与明细连成一块。
- 主分保留 50×4 条形，次级列降到 30×2；宽面板下模型列限 30%，操作列只包内容，右端不再空一列。
- 补键盘焦点环；`prefers-reduced-motion` 下关掉按钮过渡。
- 文本榜 KPI 的批次日期改用 `11/19`，不再读成分数区间。
- README 截图换成七页签版本：编程 / 文本 / Harness / 额度四张，用 `preview.mjs --live --static` 按实抓数据渲染。

### 修复

- 空态层级反了：标题是裸文本 13px、提示 span 反而吃到 19px。标题改用 `.mdlb-empty-title`，五个旧页签的空态一并修正（默认态布局不变）。

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
