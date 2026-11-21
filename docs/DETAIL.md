# Modeldial 看板

侧栏里的「排行榜」入口，打开后是主列里的一整页看板，三个页签：

- **编程榜单**：Modeldial 的编程排行榜（综合轴），54 个模型的综合分、后端工程、视觉审美、知识推理、前端工程、可维护性、评测用时和费用。点表头排序，右上角搜索框按模型名过滤，模型名可点开对应页面。
- **订阅额度**：各家订阅套餐的每周额度实测（OpenAI / Claude / Grok / Google / GLM / Kimi / MiMo / MiniMax），按套餐和模型列出每周可用 Token 量与 API 等值。右上角可切 USD / CNY。
- **性价比**：把上面所有「套餐 × 模型」按每 $1 换到的 Token 排序，可先按 provider 过滤，同样支持 USD / CNY。

## 数据来源

- 榜单：<https://modeldial.com/leaderboard/coding?axis=overall>
- 额度：<https://modeldial.com/subscriptions?period=week&view=catalog&currency=CNY&provider=Google>

两个页面都是服务端渲染的表格，Host 端抓取 HTML 并解析，不跑浏览器、不调第三方 API。

## 人民币折算

额度页原站只渲染美元。切到 CNY 时，面板按 `open.er-api.com` 的美元汇率折算月费与 API 等值，并在开关旁标出所用汇率；汇率接口取不到时退回固定值 6.69 并标注「估算」。

## 行为

- 打开页签时抓一次；Host 端内存缓存（榜单 4 分钟、额度 10 分钟），点「刷新」强制抓新数据。
- 抓取失败时页面顶部出现红色提示和「重试」，并继续显示上一次成功抓到的数据（标注抓取时间），不会显示成空榜。
- 页面结构如果变了，解析不到行时按失败处理，提示「页面里没有解析到模型行」。

## 接口

- `GET /__modeldial/leaderboard`、`GET /__modeldial/quota`，加 `?force=1` 跳过缓存。

## 卸载

插件页找到「Modeldial 看板」停用或移除即可，不影响其它插件。
