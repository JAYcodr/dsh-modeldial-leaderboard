# Modeldial 看板

侧栏里的「排行榜」入口，打开后是主列里的一整页看板，七个页签：

- **编程榜单**：Modeldial 的编程排行榜（综合轴），55 个模型的综合分、后端工程、视觉审美、知识推理、前端工程、可维护性、评测用时、费用和发布日期。点表头排序，右上角搜索框按模型名过滤，模型名可点开对应页面。
- **文本能力榜**：38 个模型的文本总分、理解、输出与 8 个评分维度（语义辨析、证据整合、意图推断、规则应用、文本表达、文体适配、叙事推进、成稿完整度）。行尾「展开维度」按行展开；写作、翻译选型看这张。
- **Harness 榜**：23 个 harness 本体的综合分、稳定完成率、时间效率、成本效率和 8 个能力域；同样可展开维度。三张榜量纲不同，不要跨榜比分数。
- **订阅额度**：21 家厂商、68 个套餐的额度矩阵，可看全部或只挑一家，按套餐和模型列出可用 Token 量与 API 等值。上游有的按周给药、有的按月给，面板统一按 52/12 折成月显示。右上角可切 USD / CNY。
- **性价比**：把上面所有「套餐 × 模型」按每 $1 换到的 Token 排序，可先按厂商过滤，同样支持 USD / CNY。
- **按模型**：选一个模型，看哪些厂商的哪些套餐收录它、各自给多少额度。
- **按预算**：输入月预算和月用量，看哪些套餐买得起、够不够用，可展开看每个模型的明细。

## 数据来源

- 编程榜单：<https://modeldial.com/leaderboard/coding?axis=overall>
- 文本能力榜：<https://reference.modeldial.com/writing-snapshots/current.json>（页面自身读取的官方快照，客户端渲染的榜靠它取数）
- Harness 榜：<https://modeldial.com/leaderboard/harness>
- 订阅额度：<https://modeldial.com/subscriptions?period=week&view=catalog&currency=CNY>

前三个页面里除文本榜外都是服务端渲染的表格；Host 端抓 HTML 解析，文本榜直接抓同源官方快照 JSON，不跑浏览器、不调第三方 API。

## 人民币折算

额度页原站只渲染美元。切到 CNY 时，面板按 `open.er-api.com` 的美元汇率折算月费与 API 等值，并在开关旁标出所用汇率；汇率接口取不到时退回固定值 6.69 并标注「估算」。

## 行为

- 打开页签时抓一次；Host 端内存缓存（编程 4 分钟、文本 15 分钟、Harness 与额度 10 分钟），点「刷新」强制抓当前页签的新数据。
- 每个源最后一次成功的数据会原子落盘到 `${DSH_HOME:-~/.dsh}/cache/modeldial-leaderboard/`，DSH 重启后先读盘再按需刷新。
- 抓取失败时页面顶部出现红色提示和「重试」，并继续显示上一次成功抓到的数据（标注抓取时间），不会显示成空榜。
- 页面结构如果变了，解析不到行时按失败处理，提示「页面里没有解析到模型行」。

## 接口

- `GET /__modeldial/leaderboard`、`GET /__modeldial/quota`、`GET /__modeldial/writing`、`GET /__modeldial/harness`，加 `?force=1` 跳过缓存。

## 安装 / 卸载

安装步骤见 README 的「安装」一节。

卸载：在 `~/.dsh/profiles/<profile>/package.json` 的依赖和 `dsh.profile.bundles` 里移除条目，删掉 `node_modules/@local/modeldial-leaderboard` 软链，重启 DSH。也可以在插件页停用它，不影响其它插件。
