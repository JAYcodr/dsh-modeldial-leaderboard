/**
 * Client half of the Modeldial panel bundle: the "排行榜" sidebar entry and
 * the page it opens in the main column, with two tabs — the coding
 * leaderboard and the subscription quota matrices.
 *
 * All data comes from the Host half's same-origin JSON routes; this module
 * only renders. Styles are rendered as a React element so unmounting removes
 * them, and colors come from the host theme tokens.
 */
window.__ModuleLoader__.load({
  id: '@local/modeldial-leaderboard',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

    const NS = 'modeldialLeaderboard'
    const PANEL_ID = 'modeldial-leaderboard'

    const zh = {
      panel: '排行榜',
      title: 'Modeldial 看板',
      lede: '目录规模',
      ledeProviders: '家厂商',
      ledePlans: '个套餐',
      kpiProviders: 'Providers 厂商',
      kpiPlans: 'Plans 套餐',
      kpiModels: 'Models 模型',
      kpiCombos: 'Comparable 可比组合',
      kpiBoardModels: 'Models 模型',
      kpiBoardNew: 'New 新模型',
      secTop: '前三名 · 综合分',
      secTopRight: '按 Modeldial 综合轴',
      secAll: '完整榜单',
      secRest: '第 4 名之后',
      secMatrix: '额度矩阵',
      secMatrixRight: 'Token 单位 · 亿 / 月 · 周额度按 52/12 折月',
      secValue: '性价比排序',
      secModel: '模型 × 套餐',
      secBudget: '预算内套餐',
      tabBoard: '编程榜单',
      tabQuota: '订阅额度',
      tabValue: '性价比',
      boardSub: '综合轴 · 全部模型',
      quotaSub: '月均额度 · 按套餐对比',
      valueSub: '每 $1 换到的 Token · 跨套餐排序',
      valueSubCny: '每 ¥1 换到的 Token · 跨套餐排序',
      refresh: '刷新',
      refreshing: '抓取中…',
      updated: '更新于 {time}',
      cached: '缓存',
      failed: '抓取失败：{error}',
      stale: '以下是 {time} 抓到的结果',
      retry: '重试',
      empty: '还没有数据',
      emptyHint: '点「刷新」抓一次',
      noMatch: '没有匹配的模型',
      noMatchHint: '换个关键词，或清空搜索框',
      colRank: '排名',
      colModel: '模型',
      colOverall: '综合',
      colBackend: '后端工程',
      colAesthetic: '视觉审美',
      colKnowledge: '知识推理',
      colFrontend: '前端工程',
      colMaintain: '可维护性',
      colDuration: '评测用时',
      colCost: '费用',
      colReleased: '发布',
      effortCount: '{n} 档',
      weeklyNote: '上游此格按周给额度，已折成月',
      model: '模型',
      plan: '套餐',
      newBadge: '新',
      allProviders: '全部',
      comboCount: '{n} 个组合',
      quotaCoverage: '{p} 家厂商 · {n} 个套餐',
      colPlan: '套餐',
      colWeekly: '月均额度 · 亿 Token',
      colApi: 'API 等值 · 月',
      colPerDollar: '每 $1 · 万 Token / 月',
      colPerYuan: '每 ¥1 · 万 Token / 月',
      planPrice: '{price} / 月',
      apiValue: '≈ {value}',
      rateHint: '人民币按 open.er-api.com 的美元汇率折算',
      estimate: '估算',
      searchPlaceholder: '搜索模型…',
      boardCount: '{n} 个模型',
      boardFiltered: '{n} 个匹配',
      tabModel: '按模型',
      tabBudget: '按预算',
      modelSub: '同一个模型，哪家套餐给得最多',
      budgetSub: '预算内能买到什么 · 按套餐月费排序',
      pickModel: '选择模型',
      modelCoverage: '{p} 家收录 · {r} 个套餐',
      sortBest: '单位价格最划算',
      sortCheap: '月费最低',
      soloNotice: '这个模型只有 {p} 收录',
      noPlanForModel: '没有套餐收录这个模型',
      noPlanForModelHint: '上游目录里暂时没有它的额度数据，换一个模型看看',
      colVendor: '厂商',
      colQuotaOfModel: '该模型额度 · 亿',
      budgetLabel: '月预算',
      usageLabel: '每月用量',
      usageUnit: '亿 Token / 月',
      usageOptional: '选填',
      usagePlaceholder: '选填',
      budgetHit: '命中 {n} 个套餐',
      budgetNone: '这个预算内没有套餐',
      budgetNoneHint: '把预算调高一点，最便宜的套餐是 {price}',
      usageSummary: '{ok} 个模型能撑满整月，共 {all} 个模型',
      usageSummaryBad: '{ok} 个模型能撑满整月，{bad} 个不够，{unknown} 个额度未知',
      usageNone: '不满足的模型',
      usagePlanCount: '{ok} / {all} 个套餐能撑住',
      colCover: '覆盖模型',
      colEnough: '够不够',
      expandDetail: '展开明细',
      collapseDetail: '收起明细',
      monthsValue: '{v} 个月',
      monthsShort: '{v}',
      quotaUnknown: '额度未知',
      perMonthUnit: '月',
    }

    const en = {
      panel: 'Leaderboard',
      title: 'Modeldial board',
      lede: 'Catalog size',
      ledeProviders: 'providers',
      ledePlans: 'plans',
      kpiProviders: 'Providers',
      kpiPlans: 'Plans',
      kpiModels: 'Models',
      kpiCombos: 'Comparable combos',
      kpiBoardModels: 'Models',
      kpiBoardNew: 'New models',
      secTop: 'Top 3 by overall',
      secTopRight: 'Modeldial overall axis',
      secAll: 'Full ranking',
      secRest: 'From #4 down',
      secMatrix: 'Quota matrix',
      secMatrixRight: '100M tok / month · weekly ×52/12',
      secValue: 'Value order',
      secModel: 'Model × plan',
      secBudget: 'Plans in budget',
      tabBoard: 'Coding ranks',
      tabQuota: 'Quotas',
      tabValue: 'Value',
      boardSub: 'Overall axis · every model',
      quotaSub: 'Weekly quota · by plan',
      valueSub: 'Tokens per $1 · every plan, ranked',
      valueSubCny: 'Tokens per ¥1 · every plan, ranked',
      refresh: 'Refresh',
      refreshing: 'Fetching…',
      updated: 'Updated {time}',
      cached: 'cached',
      failed: 'Fetch failed: {error}',
      stale: 'Showing the result fetched at {time}',
      retry: 'Retry',
      empty: 'No data yet',
      emptyHint: 'Press Refresh',
      noMatch: 'No matching model',
      noMatchHint: 'Try another keyword or clear the search',
      colRank: '#',
      colModel: 'Model',
      colOverall: 'Overall',
      colBackend: 'Backend',
      colAesthetic: 'Aesthetic',
      colKnowledge: 'Knowledge',
      colFrontend: 'Frontend',
      colMaintain: 'Maintain',
      colDuration: 'Duration',
      colCost: 'Cost',
      colReleased: 'Released',
      effortCount: '{n} levels',
      weeklyNote: 'Upstream quotes this cell per week; converted to a month',
      model: 'Model',
      plan: 'Plan',
      newBadge: 'new',
      allProviders: 'All',
      comboCount: '{n} combos',
      quotaCoverage: '{p} providers · {n} plans',
      colPlan: 'Plan',
      colWeekly: 'Monthly quota · 100M tok',
      colApi: 'API value / mo',
      colPerDollar: 'Per $1 · 10k tok / mo',
      colPerYuan: 'Per ¥1 · 10k tok / mo',
      planPrice: '{price} / mo',
      apiValue: '≈ {value}',
      rateHint: 'CNY converted with the USD rate from open.er-api.com',
      estimate: 'estimated',
      searchPlaceholder: 'Search models…',
      boardCount: '{n} models',
      boardFiltered: '{n} matches',
      tabModel: 'By model',
      tabBudget: 'By budget',
      modelSub: 'Which plan gives most of this model',
      budgetSub: 'What a monthly budget buys · cheapest first',
      pickModel: 'Model',
      modelCoverage: '{p} providers · {r} plans',
      sortBest: 'Best value',
      sortCheap: 'Cheapest',
      soloNotice: 'Only {p} carries this model',
      noPlanForModel: 'No plan carries this model',
      noPlanForModelHint: 'The catalog has no quota data for it yet — try another model',
      colVendor: 'Provider',
      colQuotaOfModel: 'Quota · 100M',
      budgetLabel: 'Monthly budget',
      usageLabel: 'Monthly usage',
      usageUnit: '× 100M tok / mo',
      usageOptional: 'optional',
      usagePlaceholder: 'optional',
      budgetHit: '{n} plans',
      budgetNone: 'No plan under this budget',
      budgetNoneHint: 'Raise it a little — the cheapest plan is {price}',
      usageSummary: '{ok} of {all} models last the whole month',
      usageSummaryBad: '{ok} last the month, {bad} do not, {unknown} unknown',
      usageNone: 'Short of a month',
      usagePlanCount: '{ok} of {all} plans last it',
      colCover: 'Models',
      colEnough: 'Lasts a month',
      expandDetail: 'Show details',
      collapseDetail: 'Hide details',
      monthsValue: '{v} months',
      monthsShort: '{v}',
      quotaUnknown: 'quota unknown',
      perMonthUnit: 'mo',
    }

    const SCORE_COLUMNS = [
      ['overall', 'colOverall'],
      ['backend', 'colBackend'],
      ['aesthetic', 'colAesthetic'],
      ['knowledge', 'colKnowledge'],
      ['frontend', 'colFrontend'],
      ['maintainability', 'colMaintain'],
    ]

    const CSS = `
      /* ---------------------------------------------------------------
         瑞士编辑版式（style A）：刊头双段大字、编号章节、发丝线、
         零圆角零阴影。颜色一律走宿主 token，暗色自动跟随；
         唯一的固定色是 IKB 蓝（亮 #002fa7 / 暗 #96b0ff），靠 data-theme 切换。
         --------------------------------------------------------------- */
      .mdlb-root {
        --mdlb-ink: var(--dsw-alias-label-primary);
        --mdlb-ink2: var(--dsw-alias-label-secondary);
        --mdlb-ink3: color-mix(in srgb, var(--dsw-alias-label-tertiary) 74%, var(--dsw-alias-label-primary));
        --mdlb-accent: #002fa7;
        --mdlb-accent-contrast: #ffffff;
        --mdlb-rule: color-mix(in srgb, var(--mdlb-ink) 11%, transparent);
        --mdlb-rule-2: color-mix(in srgb, var(--mdlb-ink) 76%, transparent);
        --mdlb-rule-w: color-mix(in srgb, var(--mdlb-ink) 20%, transparent);
        --mdlb-wash: color-mix(in srgb, var(--mdlb-ink) 3.4%, var(--dsw-alias-bg-base));
        --mdlb-wash2: color-mix(in srgb, var(--mdlb-ink) 6%, var(--dsw-alias-bg-base));
        --mdlb-accent-wash: color-mix(in srgb, var(--mdlb-accent) 10%, transparent);
        --mdlb-accent-strong: var(--mdlb-accent);
        /* 兼容旧引用：这些变量名在组件里还挂着 */
        --mdlb-canvas: var(--dsw-alias-bg-base);
        --mdlb-card-bg: var(--dsw-alias-bg-base);
        --mdlb-chip-bg: transparent;
        --mdlb-head-bg: var(--dsw-alias-bg-base);
        --mdlb-zebra: transparent;
        --mdlb-line: var(--mdlb-rule);
        --mdlb-line-strong: var(--mdlb-rule-w);
        --mdlb-text-faint: var(--mdlb-ink3);
        --mdlb-skel-bg: color-mix(in srgb, var(--mdlb-ink) 10%, transparent);
        /* 半调网点：零字节的网格纸。网格 15px、点半径 2.3px —— 点更粗但不密 */
        --mdlb-pad-x: 32px;
        --mdlb-dot-gap: 15px;
        /* 点色上限由 ink3 小字的对比度反推：点越深，压在点像素上的次级文字越糟。
           实测 .115 时最浅次级文字压在点像素上只有 4.39:1（差一点点），
           降到 .105 后点像素 #e6e6e6、同一处 4.6:1，视觉上看不出差别 */
        --mdlb-dot: rgba(0, 0, 0, .105);
        /* 方块网点：15×15 的 SVG tile 里放一个 5×5 的硬边方块。
           radial-gradient 描不出直角，描边永远带一点圆弧 */
        --mdlb-dot-img: radial-gradient(circle, var(--mdlb-dot) 2px, transparent 2.4px);
        --mdlb-dot-soft: rgba(0, 0, 0, .03);
        /* 扫掠层的点：亮色下用「白」把点提亮，是明暗而不是加色 */
        --mdlb-sheen-dot: rgba(255, 255, 255, .55);
        /* 右上角那层蓝点：同一张 15×15 tile，只换 fill。冷暖就来自这层，
           不是靠把点画大或画密 */
        --mdlb-dot-blue: radial-gradient(circle, var(--mdlb-dot-blue-color) 2px, transparent 2.4px);
        --mdlb-dot-blue-color: color-mix(in srgb, var(--mdlb-accent) 46%, transparent);
        /* 指针不在面板上时把洞推到画布外，等于「没有洞」 */
        --mdlb-mx: -9999px;
        --mdlb-my: -9999px;

        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 0;
        /* 整页滚动：这里自己就是滚动容器，刊头、KPI、页签都跟着一起滚走，
           不再只有底部表格那一小块在内层滚 */
        overflow-y: auto;
        overflow-x: hidden;
        /* 上内边距必须为 0：滚动容器带 padding-top 时，吸附表头会往下粘 26px，
           上方留出一条露出表格行的缝。顶部留白改由 .mdlb-head 自己的 padding 承担 */
        padding: 0 32px 20px;
        box-sizing: border-box;
        color: var(--mdlb-ink);
        /* 网点不画在这一层：这里是底色，点和便签都在上面那层 sticky 的纸上 */
        background-color: var(--dsw-alias-bg-base);
        font-size: 13px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }
      /* 暗色：IKB 提亮，保证在深底上仍 ≥ 4.5:1 */
      :where([data-ds-dark-theme], .mdlb-dark) .mdlb-root,
      .mdlb-root[data-theme="dark"] {
        --mdlb-accent: #96b0ff;
        --mdlb-dot: rgba(255, 255, 255, .08);  /* 暗底上再亮就发灰，别跟着亮色一起加深 */
        --mdlb-dot-soft: rgba(255, 255, 255, .03);
        /* 暗色不能像亮色那样「提亮」：深底上把点提亮，浅色正文就压不住
           （实测 ink3 从 8.0 掉到 3.2）。改成把点往底色拉平——
           扫过的区域点暂时隐去，动效还在，字反而更清楚 */
        --mdlb-sheen-dot: color-mix(in srgb, var(--dsw-alias-bg-base) 78%, transparent);
        --mdlb-dot-img: radial-gradient(circle, var(--mdlb-dot) 2px, transparent 2.4px);
        /* 深底上 .42 会过曝，蓝层降到 .20 并换成提亮后的 IKB */
        --mdlb-dot-blue: radial-gradient(circle, var(--mdlb-dot-blue-color) 2px, transparent 2.4px);
        --mdlb-dot-blue-color: color-mix(in srgb, var(--mdlb-accent) 34%, transparent);
        --mdlb-accent-contrast: #0f1115;
        --mdlb-rule-2: color-mix(in srgb, var(--mdlb-ink) 84%, transparent);
      }

      /* ---------- 半调网点：流动的纸，指针处被橡皮擦掉 ---------- */
      .mdlb-paper {
        /* sticky 而不是 absolute：整页滚动下 absolute 会跟着内容滚走，
           纸应该钉在视口上，只有内容在纸上移动 */
        position: sticky;
        top: 0;
        left: 0;
        flex: none;            /* 父级是 flex 列，不写这行它会被压成 0 高 */
        height: 100vh;
        margin-bottom: -100vh; /* 不占版面：铺满视口，但不把内容推下去 */
        /* 横向吃进 root 的左右 padding：否则最右侧 32px 会是一条纯白，
           而那里恰好是渐变最浓的地方。root 有 overflow-x:hidden，不会撑出滚动条 */
        margin-inline: calc(var(--mdlb-pad-x) * -1);
        pointer-events: none;
        z-index: 0;
        background-image: var(--mdlb-dot-img);
        background-size: var(--mdlb-dot-gap) var(--mdlb-dot-gap);
        background-position: 0 0;
        /* 流动：走满一个网格正好 15px，首尾严丝合缝看不出接缝。
           28s 走一格 ≈ 0.54px/s —— 52s 只有 0.29px/s，真人看不出在动；
           再快就成走马灯 */
        animation: mdlb-drift 28s linear infinite;
        /* 两个 mask 取交集：
           ① 横向渐变 —— 左端完全透明，右段才浓，这是「左淡右浓」；
           ② 指针处的洞 —— 中间挖空、外圈渐隐，用 transparent 挖洞而不是把点染色。
           两组都写在 mask-image 里，靠 mask-composite 求交，不用额外图层 */
        -webkit-mask-image:
          linear-gradient(to top right, transparent 0 46%, rgba(0, 0, 0, .22) 60%, rgba(0, 0, 0, .62) 78%, #000 95%),
          radial-gradient(circle 90px at var(--mdlb-mx) var(--mdlb-my), transparent 0, transparent 45%, #000 100%);
        mask-image:
          linear-gradient(to top right, transparent 0 46%, rgba(0, 0, 0, .22) 60%, rgba(0, 0, 0, .62) 78%, #000 95%),
          radial-gradient(circle 90px at var(--mdlb-mx) var(--mdlb-my), transparent 0, transparent 45%, #000 100%);
        -webkit-mask-composite: source-in;
        mask-composite: intersect;
      }
      /* 副层：第二张网点纸，斜向慢移。两个方向的平移叠在一起，
         才不会像一块布整体平移；速度比主层慢，肉眼只能感觉到「在动」 */
      .mdlb-paper::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: radial-gradient(circle, var(--mdlb-dot-soft) 2px, transparent 2.4px);
        background-size: var(--mdlb-dot-gap) var(--mdlb-dot-gap);
        background-position: 0 0;
        animation: mdlb-drift-diag 71s linear infinite;
        /* 只在右上角一小块有副层，叠出「点忽明忽暗」的层次；两层完全重叠处会加深，
           所以副层的色比主层淡得多（.03 对 .105），最暗处仍守住 4.5:1 */
        /* 洞必须同时挖在这一层：否则光标扫过时只擦掉了主层，副层还留在洞里 */
        -webkit-mask-image:
          radial-gradient(ellipse 520px 360px at 100% 0%, #000 0 12%, rgba(0, 0, 0, .5) 45%, transparent 80%),
          radial-gradient(circle 90px at var(--mdlb-mx) var(--mdlb-my), transparent 0, transparent 45%, #000 100%);
        mask-image:
          radial-gradient(ellipse 520px 360px at 100% 0%, #000 0 12%, rgba(0, 0, 0, .5) 45%, transparent 80%),
          radial-gradient(circle 90px at var(--mdlb-mx) var(--mdlb-my), transparent 0, transparent 45%, #000 100%);
        -webkit-mask-composite: source-in;
        mask-composite: intersect;
      }
      /* 蓝层：同一张 tile、同一节奏，只换 fill。两层必须共用 gap/position/animation，
         否则点和点会错开半格，看起来像麻子 */
      .mdlb-paper::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background-image: var(--mdlb-dot-blue);
        background-size: var(--mdlb-dot-gap) var(--mdlb-dot-gap);
        background-position: 0 0;
        animation: mdlb-drift 28s linear infinite;
        /* 只在右上角一块透出蓝点，往下往左退成灰；洞同样要在这一层挖掉。
           纵向必须收在标题带以下（约 130px）：再往下就是冻结表头和单元格，
           那里有 10~11px 的小字，蓝点压在灰点上只剩 2.3~3.7:1，读不清 */
        -webkit-mask-image:
          radial-gradient(ellipse 560px 132px at 100% 0%, #000 0 18%, rgba(0, 0, 0, .55) 55%, transparent 100%),
          radial-gradient(circle 90px at var(--mdlb-mx) var(--mdlb-my), transparent 0, transparent 45%, #000 100%);
        mask-image:
          radial-gradient(ellipse 560px 132px at 100% 0%, #000 0 18%, rgba(0, 0, 0, .55) 55%, transparent 100%),
          radial-gradient(circle 90px at var(--mdlb-mx) var(--mdlb-my), transparent 0, transparent 45%, #000 100%);
        -webkit-mask-composite: source-in;
        mask-composite: intersect;
      }
      @keyframes mdlb-drift {
        from { background-position: 0 0; }
        to { background-position: var(--mdlb-dot-gap) 0; }
      }
      /* 斜向：x 走满一格、y 反着走一格，路径是 45°，周期又是整数倍格宽，
         首尾同样对得齐 */
      @keyframes mdlb-drift-diag {
        from { background-position: 0 0; }
        to { background-position: var(--mdlb-dot-gap) calc(var(--mdlb-dot-gap) * -1); }
      }
      /* 扫掠光带：在网点上再铺一层「白点」，同一个 15px 网格、同一个 28s，
         两层点因此永远对齐，不会互相错位；只有一块圆形窗口在慢慢横移，
         窗口里的点被提亮 → 看起来就是某片区域的点忽明忽暗。
         参考站的 particles 靠 noise 调制 size 得到同样的观感，这里用 mask 平移近似 */
      .mdlb-sheen {
        position: sticky;
        top: 0;
        left: 0;
        flex: none;
        height: 100vh;
        margin-bottom: -100vh;
        margin-inline: calc(var(--mdlb-pad-x) * -1);
        pointer-events: none;
        z-index: 0;
        background-image: radial-gradient(circle, var(--mdlb-sheen-dot) 2px, transparent 2.4px);
        background-size: var(--mdlb-dot-gap) var(--mdlb-dot-gap);
        background-position: 0 0;
        animation: mdlb-drift 28s linear infinite;
        /* 只在一块 300px 的圆里透出来，圆本身从左扫到右 */
        -webkit-mask-image: radial-gradient(circle 150px at center, #000 0 38%, transparent 100%);
        mask-image: radial-gradient(circle 150px at center, #000 0 38%, transparent 100%);
        -webkit-mask-size: 300px 300px;
        mask-size: 300px 300px;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        animation-name: mdlb-drift, mdlb-sweep;
        animation-duration: 28s, 44s;
        animation-timing-function: linear, ease-in-out;
        animation-iteration-count: infinite, infinite;
        animation-delay: 0s, -14s;
      }
      @keyframes mdlb-sweep {
        from { -webkit-mask-position: -320px 40%; mask-position: -320px 40%; }
        to { -webkit-mask-position: calc(100% + 320px) 40%; mask-position: calc(100% + 320px) 40%; }
      }

      /* 内容必须在网点之上 */
      .mdlb-root > *:not(.mdlb-paper):not(.mdlb-sheen):not(style) { position: relative; z-index: 1; }

      /* ---------- 刊头 ---------- */
      .mdlb-head {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
        gap: 24px;
        padding: 26px 0 14px;
        border-bottom: 2px solid var(--mdlb-rule-2);
      }
      .mdlb-eyebrow {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 10.5px;
        letter-spacing: .17em;
        text-transform: uppercase;
        color: var(--mdlb-ink2);
      }
      .mdlb-eyebrow::before {
        content: '';
        width: 7px; height: 7px;
        background: var(--mdlb-accent);
      }
      .mdlb-title { margin: 0; font-size: 12.5px; font-weight: 600; letter-spacing: .01em; }
      .mdlb-sub { margin: 4px 0 0; color: var(--mdlb-ink2); font-size: 12px; }

      /* 双段大字：21 家厂商 — 68 个套餐 */
      .mdlb-lede {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0 14px;
        margin: 10px 0 0;
        font-variant-numeric: tabular-nums;
      }
      .mdlb-lede b {
        font-size: 56px;
        font-weight: 480;
        letter-spacing: -.045em;
        line-height: .95;
      }
      .mdlb-lede em {
        font-style: normal;
        font-size: 17px;
        font-weight: 470;
        color: var(--mdlb-ink2);
      }
      .mdlb-lede .mdlb-lede-rule {
        width: 22px; height: 2px;
        background: var(--mdlb-accent);
        align-self: center;
      }

      /* 2 格 KPI：只放刊头大字没有的两个数，一张屏上每个数字只出现一次 */
      .mdlb-kpis {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-bottom: 1px solid var(--mdlb-rule);
        margin-top: 0;
      }
      .mdlb-kpi { padding: 16px 0 14px; min-width: 0; }
      .mdlb-kpi + .mdlb-kpi {
        padding-left: 20px;
        border-left: 1px solid var(--mdlb-rule);
      }
      .mdlb-kpi .mdlb-kpi-n {
        font-size: 46px; font-weight: 430; letter-spacing: -.045em; line-height: .95;
        font-variant-numeric: tabular-nums;
      }
      .mdlb-kpi .mdlb-kpi-l {
        margin-top: 8px; font-size: 10px; letter-spacing: .15em;
        text-transform: uppercase; color: var(--mdlb-ink2);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }

      /* ---------- 前三名大字报 ---------- */
      .mdlb-podium {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        border-bottom: 1px solid var(--mdlb-rule);
      }
      .mdlb-pod {
        padding: 13px 16px 14px 0;
        border-right: 1px solid var(--mdlb-rule);
        min-width: 0;
      }
      .mdlb-pod:nth-child(3n) { border-right: 0; }
      .mdlb-pod:nth-child(n+4) { border-top: 1px solid var(--mdlb-rule); }
      .mdlb-pod:not(:first-child) { padding-left: 16px; }
      .mdlb-pod-no {
        font-size: 10px; letter-spacing: .16em; color: var(--mdlb-ink3);
        font-variant-numeric: tabular-nums;
      }
      .mdlb-pod[data-top="true"] .mdlb-pod-no { color: var(--mdlb-accent); font-weight: 650; }
      .mdlb-pod-name {
        margin: 5px 0 0;
        font-size: 14.5px; font-weight: 550; letter-spacing: -.01em;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .mdlb-pod-name a { color: inherit; text-decoration: none; }
      .mdlb-pod-name a:hover { color: var(--mdlb-accent); }
      .mdlb-pod-score {
        display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px;
        margin-top: 6px;
        font-variant-numeric: tabular-nums;
      }
      .mdlb-pod-score b {
        font-size: 30px; font-weight: 450; letter-spacing: -.04em; line-height: 1;
      }
      .mdlb-pod[data-top="true"] .mdlb-pod-score b { font-size: 38px; }
      .mdlb-pod-unit { font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--mdlb-ink3); }
      .mdlb-pod-score .mdlb-bar { width: 100%; height: 2px; margin-top: 3px; flex-basis: 100%; }
      .mdlb-pod-meta {
        display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
        margin-top: 7px; font-size: 10px; color: var(--mdlb-ink3);
      }
      /* ---------- 章节编号 + 发丝线 ---------- */
      .mdlb-sec {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 22px 0 0;
        min-height: 16px;
      }
      .mdlb-sec .mdlb-sec-no {
        font-size: 10.5px; font-weight: 650; letter-spacing: .1em;
        color: var(--mdlb-accent); font-variant-numeric: tabular-nums;
      }
      .mdlb-sec .mdlb-sec-ttl {
        font-size: 10px; letter-spacing: .17em; text-transform: uppercase;
        color: var(--mdlb-ink2); white-space: nowrap;
      }
      .mdlb-sec .mdlb-sec-line { flex: 1; height: 1px; background: var(--mdlb-rule); }
      .mdlb-sec .mdlb-sec-rt {
        font-size: 10.5px; color: var(--mdlb-ink3); letter-spacing: .03em; white-space: nowrap;
      }

      .mdlb-actions { display: flex; align-items: center; gap: 12px; flex: none; }
      .mdlb-time {
        display: inline-flex; align-items: center; gap: 6px;
        color: var(--mdlb-ink3); font-size: 11px;
        font-variant-numeric: tabular-nums; letter-spacing: .02em;
        /* 这行正好落在右上角蓝网点的区域里：蓝点压灰点后，11px 的次级文字
           只剩 1.8:1。给它一块纸底，点和字各归各位，不必为了字把网点调淡 */
        background: var(--dsw-alias-bg-base);
        padding: 3px 7px;
        margin: -3px -7px;
      }
      .mdlb-time::before {
        content: '';
        width: 5px; height: 5px;
        background: var(--dsw-alias-state-success-primary);
      }
      .mdlb-time[data-stale="true"]::before { background: var(--dsw-alias-state-error-primary); }
      .mdlb-btn {
        appearance: none; display: inline-flex; align-items: center; gap: 5px;
        border: 1px solid var(--mdlb-rule-2); border-radius: 0;
        background: transparent; color: var(--mdlb-ink);
        font: inherit; font-size: 11.5px; font-weight: 500;
        padding: 4px 10px; cursor: pointer;
        transition: color .12s ease, border-color .12s ease, background .12s ease;
      }
      .mdlb-btn:hover:not(:disabled) {
        color: var(--mdlb-accent);
        border-color: var(--mdlb-accent);
        background: var(--mdlb-accent-wash);
      }
      .mdlb-btn:disabled { color: var(--mdlb-ink3); cursor: default; border-color: var(--mdlb-rule); }

      /* ---------- 页签：下划线制式 ---------- */
      .mdlb-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 0 20px;
        align-self: stretch;
        margin: 14px 0 0;
        padding: 0;
        border: 0;
        border-bottom: 1px solid var(--mdlb-rule);
        background: none;
      }
      .mdlb-tab {
        appearance: none; border: 0; background: none;
        color: var(--mdlb-ink2); font: inherit; font-size: 12.5px;
        padding: 0 0 9px; margin-bottom: -1px;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: color .12s ease, border-color .12s ease;
      }
      .mdlb-tab:hover { color: var(--mdlb-ink); }
      .mdlb-tab[data-active="true"] {
        color: var(--mdlb-ink); font-weight: 600;
        border-bottom-color: var(--mdlb-accent);
        background: none; box-shadow: none;
      }

      /* ---------- 提示条 ---------- */
      .mdlb-banner {
        display: flex; align-items: center; flex-wrap: wrap; gap: 2px;
        margin: 12px 0 0; padding: 7px 11px;
        border: 0; border-left: 2px solid var(--dsw-alias-state-error-primary);
        border-radius: 0; font-size: 12px;
        color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 76%, var(--mdlb-ink));
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 7%, transparent);
      }

      /* ---------- 主区：去掉卡片外壳 ---------- */
      .mdlb-main {
        flex: 0 0 auto; display: flex; flex-direction: column;
        margin-top: 0;
        min-height: 0;
      }
      /* 卡片外壳已经不存在了：不再设高度，内容撑多高就多高 */
      .mdlb-card {
        flex: 0 0 auto; display: flex; flex-direction: column;
        border: 0; border-radius: 0;
        background: none;
        overflow: visible;
        box-shadow: none;
      }
      .mdlb-card-top {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
        gap: 8px 16px;
        padding: 12px 0 11px;
        border-bottom: 1px solid var(--mdlb-rule);
        background: none;
      }
      /* 表格区只负责横向滚动。纵向必须是 clip：auto/hidden 会变成新的滚动容器，
         表头的 position:sticky 就绑到它身上、滚出视野就消失 */
      .mdlb-body {
        flex: 0 0 auto;
        overflow-x: auto;
        overflow-y: clip;
      }
      .mdlb-root::-webkit-scrollbar,
      .mdlb-body::-webkit-scrollbar { width: 9px; height: 9px; }
      .mdlb-root::-webkit-scrollbar-thumb,
      .mdlb-body::-webkit-scrollbar-thumb {
        background: color-mix(in srgb, var(--mdlb-ink) 20%, transparent);
        border-radius: 0;
        border: 3px solid var(--dsw-alias-bg-base);
      }
      .mdlb-root::-webkit-scrollbar-track,
      .mdlb-body::-webkit-scrollbar-track { background: transparent; }

      /* ---------- 表格：发丝线 + 数字右对齐 ---------- */
      .mdlb-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-variant-numeric: tabular-nums;
      }
      .mdlb-table[data-wide="true"] { width: max-content; min-width: 100%; }
      .mdlb-table th:first-child, .mdlb-table td:first-child { position: sticky; left: 0; }
      .mdlb-table th:first-child { z-index: 3; }
      .mdlb-table td:first-child { z-index: 1; background: var(--dsw-alias-bg-base); }
      .mdlb-table th.mdlb-left:first-child, .mdlb-table td.mdlb-left:first-child,
      .mdlb-table th.mdlb-rank:first-child, .mdlb-table td.mdlb-rank:first-child {
        box-shadow: inset -1px 0 0 var(--mdlb-rule);
      }
      .mdlb-table th {
        position: sticky; top: 0; z-index: 2;
        text-align: right; white-space: nowrap;
        background: var(--dsw-alias-bg-base);
        color: var(--mdlb-ink3);
        font-weight: 500;
        font-size: 10px;
        letter-spacing: .15em;
        text-transform: uppercase;
        padding: 8px 9px;
        border-bottom: 1px solid var(--mdlb-rule-2);
      }
      .mdlb-table th[data-sortable="true"] { cursor: pointer; transition: color .12s ease; }
      .mdlb-table th[data-sortable="true"]:hover { color: var(--mdlb-ink); }
      .mdlb-table th[data-active="true"] { color: var(--mdlb-accent); }
      .mdlb-table td {
        padding: 8px 9px;
        border-bottom: 1px solid var(--mdlb-rule);
        text-align: right;
        white-space: nowrap;
        font-size: 13px;
      }
      .mdlb-table tbody tr:nth-child(even) td { background: transparent; }
      .mdlb-table tbody tr:hover td { background: var(--mdlb-wash); }
      .mdlb-table tbody tr:hover td:first-child { background: var(--mdlb-wash); }
      .mdlb-table tbody tr:last-child td { border-bottom: 0; }
      .mdlb-table th.mdlb-left, .mdlb-table td.mdlb-left { text-align: left; }

      .mdlb-rank { width: 1%; min-width: 54px; color: var(--mdlb-ink3); font-size: 11px; }
      .mdlb-rank span {
        display: inline-block; min-width: 22px;
        font-variant-numeric: tabular-nums;
        letter-spacing: .06em;
        transition: color .12s ease;
      }
      /* hover 只换颜色，不做位移，瑞士版面里行不能跳 */
      .mdlb-table tbody tr:hover .mdlb-rank span { color: var(--mdlb-accent); }
      .mdlb-rank[data-top="true"] span {
        color: var(--mdlb-accent);
        font-weight: 650;
        background: none;
      }

      /* 加了「发布」列后 11 列在 1240 宽会溢出 18px：模型列不再吃掉全部余量，
         留 168px 给标签、其余让给数字列，这样表宽自然落在可视区内 */
      .mdlb-name { display: flex; align-items: center; gap: 6px; min-width: 168px; max-width: 300px; }
      .mdlb-name > a, .mdlb-name > span:not(.mdlb-chip) {
        overflow: hidden; text-overflow: ellipsis; min-width: 0;
      }
      .mdlb-name > span, .mdlb-name > a { font-weight: 520; }
      .mdlb-name a {
        color: inherit; text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: color .12s ease, border-color .12s ease;
      }
      .mdlb-name a:hover { color: var(--mdlb-accent); border-bottom-color: var(--mdlb-accent); }

      /* 胶囊：零圆角的小标签，只作标注，不作装饰 */
      .mdlb-chip {
        display: inline-block;
        padding: 0 5px;
        border: 1px solid var(--mdlb-rule-w);
        border-radius: 0;
        font-size: 10.5px; line-height: 16px;
        letter-spacing: .02em;
        color: var(--mdlb-ink2);
        background: transparent;
      }
      .mdlb-chip[data-tone="new"] {
        color: var(--mdlb-accent);
        border-color: var(--mdlb-accent);
        background: var(--mdlb-accent-wash);
        font-weight: 600;
      }
      .mdlb-chip[data-tone="short"] {
        color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 76%, var(--mdlb-ink));
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 46%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
      }
      .mdlb-chip[data-unknown="true"] {
        color: var(--mdlb-ink3);
        border-style: dashed;
        border-color: var(--mdlb-rule-w);
        background: transparent;
      }
      .mdlb-unknown-tag {
        font-size: 10px; padding: 0 5px; line-height: 15px;
        border: 1px dashed var(--mdlb-rule-w);
        border-radius: 0;
        white-space: nowrap;
        color: var(--mdlb-ink3);
      }

      /* 分数条：单色，长度即强弱 */
      .mdlb-score {
        display: inline-flex; align-items: center; gap: 7px;
        justify-content: flex-end;
      }
      .mdlb-bar {
        display: inline-block;
        width: 38px; height: 3px;
        border-radius: 0;
        background: color-mix(in srgb, var(--mdlb-ink) 10%, transparent);
        overflow: hidden;
      }
      .mdlb-bar > i {
        display: block; height: 100%; border-radius: 0;
        background: var(--mdlb-accent);
        /* 生长动效：只 transform，不碰 width（inline width 才是真实值） */
        transform-origin: left center;
        /* backwards 而不是 both：动画结束就交还原样式，
           不会留下一个恒等 transform 给整行建 stacking context */
        animation: mdlb-grow .34s cubic-bezier(.22, 1, .36, 1) backwards;
      }
      .mdlb-main-score { font-weight: 650; }
      .mdlb-main-score .mdlb-bar { width: 50px; height: 4px; }
      .mdlb-muted { color: var(--mdlb-ink3); }

      /* 空状态：顶左排，不做居中的大空白 */
      .mdlb-empty {
        flex: 1; display: flex; flex-direction: column;
        align-items: flex-start; justify-content: flex-start;
        gap: 6px; padding: 56px 0 40px;
        color: var(--mdlb-ink2); font-size: 13px;
        text-align: left;
        border-top: 1px solid var(--mdlb-rule-2);
        margin-top: 12px;
        max-width: 52em;
      }
      .mdlb-empty > .mdlb-empty-title,
      .mdlb-empty > span:first-child {
        color: var(--mdlb-ink);
        font-size: 19px; font-weight: 500; letter-spacing: -.01em;
        line-height: 1.4;
      }
      .mdlb-empty > span {
        color: var(--mdlb-ink2); font-size: 12.5px; line-height: 1.7;
        max-width: 42em;
      }
      .mdlb-empty-cell { padding: 0 !important; border-bottom: 0 !important; }

      /* 厂商切换：底部下划线的高亮标签 */
      .mdlb-providers {
        display: flex; flex-wrap: wrap; gap: 2px 16px;
        margin: 0;
        padding-bottom: 1px;
      }
      .mdlb-provider {
        appearance: none; cursor: pointer; font: inherit;
        font-size: 11.5px; letter-spacing: .02em;
        padding: 2px 0 6px;
        border: 0; border-radius: 0;
        border-bottom: 2px solid transparent;
        color: var(--mdlb-ink2);
        background: transparent;
        transition: color .12s ease, border-color .12s ease;
      }
      .mdlb-provider:hover { color: var(--mdlb-ink); border-bottom-color: var(--mdlb-rule-w); }
      .mdlb-provider[data-active="true"] {
        color: var(--mdlb-accent);
        font-weight: 650;
        border-bottom-color: var(--mdlb-accent);
        background: none;
      }
      .mdlb-caption {
        color: var(--mdlb-ink3); font-size: 10.5px; margin: 0;
        white-space: nowrap; letter-spacing: .02em;
      }
      @media (max-width: 1180px) { .mdlb-caption { display: none; } }

      /* 「全部」视图里每家一段：段与段之间用发丝线断开，标题左对齐 */
      .mdlb-quota-block { border-top: 1px solid var(--mdlb-rule); padding: 14px 16px 0; }
      .mdlb-quota-block:first-of-type { border-top: 0; padding-top: 4px; }
      .mdlb-quota-block .mdlb-caption { margin: 0 0 6px; }
      .mdlb-quota-title {
        display: flex; align-items: baseline; gap: 2px;
        margin: 0 0 8px; font-size: 11px; letter-spacing: .04em;
        color: var(--mdlb-ink3);
      }
      .mdlb-quota-title b { color: var(--mdlb-ink); font-weight: 600; letter-spacing: .02em; }
      /* 日期列只占 5 个字符，不参与拉伸 */
      .mdlb-date { white-space: nowrap; font-variant-numeric: tabular-nums; width: 1%; }

      .mdlb-plan-head { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
      .mdlb-plan-name { font-weight: 550; color: var(--mdlb-ink); }
      .mdlb-plan-price { color: var(--mdlb-ink3); font-size: 10px; font-weight: 400; letter-spacing: .02em; }
      .mdlb-cell { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
      .mdlb-cell b { font-weight: 600; font-size: 13px; }
      .mdlb-cell small { color: var(--mdlb-ink3); font-size: 10px; }

      .mdlb-toolbar-left, .mdlb-toolbar-right {
        display: flex; flex-wrap: wrap; align-items: center;
        gap: 6px; min-width: 0;
      }
      .mdlb-count {
        color: var(--mdlb-ink3); font-size: 11px;
        font-variant-numeric: tabular-nums; white-space: nowrap;
        letter-spacing: .02em;
      }
      .mdlb-toolbar-left .mdlb-count {
        margin-left: 2px; padding-left: 11px;
        border-left: 1px solid var(--mdlb-rule);
      }

      /* 控件：零圆角，方框只留一条发丝线 */
      .mdlb-search, .mdlb-select, .mdlb-num {
        appearance: none;
        border: 1px solid var(--mdlb-rule-w);
        border-radius: 0;
        background: transparent;
        color: var(--mdlb-ink);
        font: inherit; font-size: 12px;
        padding: 5px 9px;
        outline: none;
      }
      .mdlb-search { width: 190px; }
      .mdlb-search::placeholder { color: var(--mdlb-ink3); }
      .mdlb-search:focus, .mdlb-select:focus, .mdlb-num:focus {
        border-color: var(--mdlb-accent);
        box-shadow: 0 0 0 1px var(--mdlb-accent);
      }
      .mdlb-select {
        min-width: 0; flex: 1 1 150px; max-width: 300px;
        text-overflow: ellipsis;
      }
      .mdlb-num { width: 96px; text-align: right; font-variant-numeric: tabular-nums; }
      .mdlb-field {
        display: inline-flex; align-items: center; gap: 6px;
        min-width: 0;
        font-size: 11px; color: var(--mdlb-ink2); white-space: nowrap;
        letter-spacing: .04em;
      }
      .mdlb-field + .mdlb-field { margin-left: 12px; }
      .mdlb-affix { color: var(--mdlb-ink); font-size: 11.5px; }
      .mdlb-optional { color: var(--mdlb-ink3); font-size: 10.5px; }
      .mdlb-field > .mdlb-num + .mdlb-affix { margin-left: 1px; }
      .mdlb-note { color: var(--mdlb-ink3); font-size: 11px; }
      .mdlb-notice {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 10.5px; padding: 1px 7px;
        border: 1px solid var(--mdlb-accent);
        border-radius: 0; white-space: nowrap;
        color: var(--mdlb-accent);
        background: var(--mdlb-accent-wash);
      }

      .mdlb-cur { display: inline-flex; align-items: center; gap: 8px; }
      .mdlb-seg {
        display: inline-flex; gap: 0;
        padding: 0;
        border: 0; border-bottom: 1px solid var(--mdlb-rule);
        border-radius: 0;
        background: none;
      }
      .mdlb-seg-btn {
        appearance: none; border: 0; background: none; white-space: nowrap;
        color: var(--mdlb-ink2); font: inherit; font-size: 11px;
        letter-spacing: .03em;
        padding: 3px 8px 6px; margin-bottom: -1px;
        border-bottom: 2px solid transparent;
        border-radius: 0; cursor: pointer;
      }
      .mdlb-seg-btn:hover { color: var(--mdlb-ink); }
      .mdlb-seg-btn[data-active="true"] {
        background: none;
        color: var(--mdlb-accent);
        font-weight: 650;
        border-bottom-color: var(--mdlb-accent);
        box-shadow: none;
      }
      .mdlb-rate {
        color: var(--mdlb-ink3); font-size: 10.5px;
        font-variant-numeric: tabular-nums; white-space: nowrap;
        letter-spacing: .02em;
      }
      .mdlb-plan-cell { display: flex; flex-direction: column; gap: 1px; min-width: 170px; }
      .mdlb-plan-meta { color: var(--mdlb-ink2); font-size: 10.5px; }

      /* 汇总行：编号章节同款的分隔，不用色块 */
      .mdlb-summary {
        display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px;
        padding: 9px 0 8px;
        border-bottom: 1px solid var(--mdlb-rule);
        font-size: 12.5px; color: var(--mdlb-ink2);
      }
      .mdlb-summary b {
        color: var(--mdlb-accent);
        font-variant-numeric: tabular-nums;
        font-weight: 650;
      }
      .mdlb-summary .mdlb-note { white-space: nowrap; }

      /* 覆盖模型列 */
      .mdlb-cover {
        display: flex; flex-wrap: wrap; gap: 4px 6px;
        justify-content: flex-start; align-content: flex-start;
        width: 100%; min-width: 300px;
      }
      .mdlb-cover .mdlb-chip {
        max-width: 168px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .mdlb-table th.mdlb-cover-col, .mdlb-table td.mdlb-cover-col {
        width: 360px; min-width: 300px; max-width: 360px;
      }

      /* 够不够 */
      .mdlb-mini {
        width: 54px; height: 3px; border-radius: 0; overflow: hidden;
        background: color-mix(in srgb, var(--mdlb-ink) 11%, transparent);
        display: inline-block; vertical-align: middle;
      }
      .mdlb-mini > i { display: block; height: 100%; background: var(--mdlb-accent); }
      .mdlb-mini[data-tone="bad"] > i { background: var(--dsw-alias-state-error-primary); }
      .mdlb-enough { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
      .mdlb-enough > * { flex: none; }
      .mdlb-badpill {
        font-size: 10.5px; padding: 0 6px; line-height: 16px;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 46%, transparent);
        border-radius: 0; white-space: nowrap;
        color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 76%, var(--mdlb-ink));
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
      }
      .mdlb-badpill[data-kind="unknown"] {
        color: var(--mdlb-ink3);
        background: transparent;
        border: 1px dashed var(--mdlb-rule-w);
      }
      .mdlb-goods {
        font-size: 11px; color: var(--mdlb-ink2);
        font-variant-numeric: tabular-nums;
      }
      .mdlb-rowbtn {
        appearance: none; border: 0; padding: 0; background: none; cursor: pointer;
        font: inherit; font-size: 10.5px; color: var(--mdlb-accent);
        text-decoration: underline; text-underline-offset: 2px;
        letter-spacing: .02em;
      }
      .mdlb-detail td {
        background: var(--mdlb-wash);
        border-bottom: 1px solid var(--mdlb-rule);
      }
      .mdlb-detail td + td { border-bottom: 0; }
      .mdlb-detail-list { display: flex; flex-wrap: wrap; gap: 6px 16px; padding: 7px 11px 9px; }
      .mdlb-detail-item {
        display: inline-flex; align-items: baseline; gap: 4px;
        font-size: 11px; color: var(--mdlb-ink2);
        font-variant-numeric: tabular-nums;
      }
      .mdlb-detail-item > span:first-child { margin-right: 2px; }
      .mdlb-detail-item b { font-size: 12px; font-weight: 600; color: var(--mdlb-ink); font-variant-numeric: tabular-nums; }
      .mdlb-detail-item[data-bad="true"] b {
        color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 78%, var(--mdlb-ink));
      }
      .mdlb-detail-item[data-unknown="true"] > span { color: var(--mdlb-ink3); }

      /* 骨架 */
      .mdlb-skel {
        display: block; border-radius: 0;
        background: var(--mdlb-skel-bg);
        animation: mdlb-shimmer 1.6s ease-in-out infinite;
      }
      .mdlb-skel-rows { padding: 2px 0; }
      .mdlb-skel-row {
        display: grid; align-items: center; gap: 20px;
        height: 34px; padding: 0 11px;
        grid-template-columns: 18px minmax(120px, 1.4fr) repeat(6, minmax(0, 1fr)) 56px 52px;
        border-bottom: 1px solid var(--mdlb-rule);
      }
      .mdlb-skel-row:last-child { border-bottom: 0; }
      @keyframes mdlb-shimmer { 0%, 100% { opacity: .5; } 50% { opacity: .85; } }

      /* ---------- 微动效：只动 transform / opacity，不动布局 ---------- */
      @keyframes mdlb-grow {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }
      @keyframes mdlb-fade {
        from { opacity: 0; transform: translateY(5px); }
        /* 收尾必须是 none：留在 translateY(0) 也算一次 transform，
           会给每行建一层 stacking context，和吸附首列的 z-index 打架 */
        to { opacity: 1; transform: none; }
      }
      /* 页签切换：整块内容淡入，key 变化才重放 */
      .mdlb-main { animation: mdlb-fade .16s ease-out backwards; }
      /* 表格行交错入场，第 12 行封顶，54 行不会拖到一秒 */
      .mdlb-table tbody tr { animation: mdlb-fade .24s ease-out backwards; animation-delay: calc(min(var(--i, 0), 12) * 14ms); }
      /* 前三名依次入场 */
      .mdlb-pod { animation: mdlb-fade .22s ease-out backwards; }
      .mdlb-pod:nth-child(1) { animation-delay: 0ms; }
      .mdlb-pod:nth-child(2) { animation-delay: 60ms; }
      .mdlb-pod:nth-child(3) { animation-delay: 120ms; }

      /* 动效全关：偏好减动效时保留最终态（动画 both 的终态就是原样式） */
      @media (prefers-reduced-motion: reduce) {
        .mdlb-skel { animation: none; opacity: .62; }
        .mdlb-bar > i,
        .mdlb-main,
        .mdlb-table tbody tr,
        .mdlb-pod,
        .mdlb-paper,
        .mdlb-paper::before,
        .mdlb-paper::after,
        .mdlb-sheen { animation: none; }
        /* 不流动，也不留洞：纸就是一张静止的网点。
           这里必须跟 .mdlb-paper 主规则的对角渐变保持一致，否则减动效下
           会退回到早就换掉的横向渐变 */
        .mdlb-paper {
          -webkit-mask-image:
            linear-gradient(to top right, transparent 0 46%, rgba(0, 0, 0, .22) 60%, rgba(0, 0, 0, .62) 78%, #000 95%);
          mask-image:
            linear-gradient(to top right, transparent 0 46%, rgba(0, 0, 0, .22) 60%, rgba(0, 0, 0, .62) 78%, #000 95%);
        }
      }

      /* ---------- 窄面板（侧栏窄宽） ---------- */
      /* 冻结「模型」列的门槛单独一条：榜单表在 1230 以下都会横向溢出，
         只要溢出，模型名就会从冻结列右边滑走。这条与下面的窄面板断点无关 */
      @media (max-width: 1229px) {
        .mdlb-table:not([data-wide="true"]) th:nth-child(2),
        .mdlb-table:not([data-wide="true"]) td:nth-child(2) {
          position: sticky; left: 72px;
          background: var(--dsw-alias-bg-base);
          box-shadow: inset -1px 0 0 var(--mdlb-rule);
        }
        .mdlb-table:not([data-wide="true"]) th:nth-child(2) { z-index: 3; }
        .mdlb-table:not([data-wide="true"]) td:nth-child(2) { z-index: 2; }
        /* min-width 必须一起放掉：全局是 168px，只改 max-width 会被它顶住，
           冻结两列会吃掉窄屏一半宽度，分数列反而更难看 */
        .mdlb-table:not([data-wide="true"]) .mdlb-name { min-width: 0; max-width: 180px; }
        /* 这一档模型列只有 180px，两个胶囊（「新」+「max · 5 档」）要吃掉 80px，
           名字就只剩 100px 出头、被截成碎片。胶囊在这一档就藏掉，
           档位数量在宽屏和 tooltip 里都还在 */
        .mdlb-table:not([data-wide="true"]) .mdlb-name .mdlb-chip:not([data-tone="new"]) { display: none; }
        .mdlb-table:not([data-wide="true"]) tbody tr:nth-child(n) td:nth-child(-n+2) {
          background: var(--dsw-alias-bg-base);
        }
        .mdlb-table:not([data-wide="true"]) tbody tr:nth-child(n):hover td:nth-child(-n+2) {
          background: var(--mdlb-wash);
        }
      }

      @media (max-width: 900px) {
        .mdlb-lede b { font-size: 40px; }
        .mdlb-lede em { font-size: 14px; }
        .mdlb-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .mdlb-kpi { padding: 12px 0 11px; }
        .mdlb-kpi + .mdlb-kpi { padding-left: 14px; }
        .mdlb-kpi .mdlb-kpi-n { font-size: 34px; }
        .mdlb-kpi .mdlb-kpi-l {
          margin-top: 7px; font-size: 9px; letter-spacing: .1em;
          white-space: normal; overflow: visible; line-height: 1.35;
        }
        /* 窄面板里大字报会吃掉首屏，改成前三名单行紧凑条，第 4~6 名藏在完整榜单里 */
        .mdlb-podium { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .mdlb-pod { padding: 9px 10px 10px 0; border-top: 0 !important; }
        .mdlb-pod:nth-child(n+4) { display: none; }
        .mdlb-pod:not(:first-child) { padding-left: 10px; }
        .mdlb-pod:nth-child(2n) { border-right: 1px solid var(--mdlb-rule); }
        .mdlb-pod:nth-child(3n) { border-right: 0; padding-left: 10px; }
        .mdlb-pod-name { white-space: nowrap; font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
        .mdlb-pod-score b, .mdlb-pod[data-top="true"] .mdlb-pod-score b { font-size: 24px; }
        .mdlb-pod-unit { display: none; }
        .mdlb-pod-detail { display: none; }
        .mdlb-sec .mdlb-sec-rt { display: none; }
        /* 窄面板：模型列里那个档位胶囊（max · 5 档）占 80px 左右，
           它一在，模型名就只剩 "GPT..." 这种碎片。窄屏把它藏掉，
           名字才有地方显示完整；藏了之后 168px 足够放 "Gemini 4 Carbon" */
        .mdlb-table:not([data-wide="true"]) .mdlb-name { min-width: 0; max-width: 168px; }
        .mdlb-table:not([data-wide="true"]) .mdlb-name .mdlb-chip:not([data-tone="new"]) { display: none; }
      }
`

    /**
     * 抓取时间带日期（11-21 15:17）。只给时分的话，隔天再看一眼分不出是
     * 今天抓的还是昨天抓的 —— 这个面板的价值全在"数据有多新"。
     */
    function formatTime(iso) {
      if (!iso) return ''
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return ''
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mi = String(d.getMinutes()).padStart(2, '0')
      return mm + '-' + dd + ' ' + hh + ':' + mi
    }

    /** Minutes from a duration cell ("591m 33s", "99m 7s"). */
    function durationMinutes(text) {
      const source = String(text || '')
      const min = source.match(/(\d+)\s*m/i)
      const sec = source.match(/(\d+)\s*s/i)
      if (!min && !sec) return null
      return (min ? Number(min[1]) : 0) * 60 + (sec ? Number(sec[1]) : 0)
    }

    /** Dollars from a cost cell ("$229.19", "暂无"). */
    function dollarsOf(text) {
      const match = String(text || '').replace(/,/g, '').match(/\$\s*([\d.]+)/)
      return match ? Number(match[1]) : null
    }

    function formatScore(value) {
      return typeof value === 'number' ? value.toFixed(1) : '—'
    }

    /** Static fallback used when the rate service is unreachable. */
    const RATE_FALLBACK = 6.69

    /** Pull the last number out of a formatted cell ("≈ 6.19", "$19.99 ／月", "每 $1 ≈ 13,413 万 Token"). */
    function parseNum(text) {
      if (!text) return null
      const tokens = String(text).match(/\d[\d,]*(?:\.\d+)?/g)
      if (!tokens || tokens.length === 0) return null
      const value = parseFloat(tokens[tokens.length - 1].replace(/,/g, ''))
      return Number.isFinite(value) ? value : null
    }

    /** Format a monthly price in the selected currency. */
    function priceText(price, currency, rate) {
      const usd = parseNum(price)
      if (usd === null) return price
      return currency === 'CNY' ? '¥' + (usd * rate.value).toFixed(2) : '$' + usd.toFixed(2)
    }

    /**
     * The site writes the "per unit of money" figure as text, e.g.
     * "每 $1 ≈ 10,294 万 Token" or "每 $1 7,583 万". The number is in 万 Token.
     * Returns those pieces so callers can re-quote it in either currency.
     */
    function parsePerUnit(text) {
      const source = String(text || '')
      const amount = source.match(/([\d,]+(?:\.\d+)?)\s*万/)
      if (!amount) return null
      const value = parseFloat(amount[1].replace(/,/g, ''))
      if (!Number.isFinite(value)) return null
      return { man: value, tail: /Token/.test(source) ? ' Token' : '' }
    }

    /**
     * "每 $1 ≈ 10,294 万 Token" quoted in the selected currency. Per-yuan
     * figures are per-dollar divided by the rate — one dollar still buys the
     * same tokens, so a yuan buys rate-times fewer.
     */
    function perUnitText(perDollar, currency, rate) {
      const parsed = parsePerUnit(perDollar)
      if (!parsed) return perDollar || ''
      const man = currency === 'CNY' ? parsed.man / rate.value : parsed.man
      const shown = man >= 100 ? Math.round(man) : Math.round(man * 10) / 10
      const symbol = currency === 'CNY' ? '¥' : '$'
      return '每 ' + symbol + '1 ≈ ' + shown.toLocaleString('en-US') + ' 万' + parsed.tail
    }

    /**
     * Just the number, for the value table's own column, where the unit sits in
     * the header. Always in 万 Token.
     */
    function perUnitValue(perDollar, currency, rate) {
      const parsed = parsePerUnit(perDollar)
      if (!parsed) return null
      return currency === 'CNY' ? parsed.man / rate.value : parsed.man
    }

    /**
     * API-equivalent cell text. Some providers do not publish a number there
     * ("共用月池上限 · 受五小时与月额度限制"); show that sentence instead of "≈ —".
     */
    function apiText(api, currency, rate) {
      const value = parseNum(api)
      if (value === null) return String(api || '').trim()
      return (currency === 'CNY'
        ? '¥' + Math.round(value * rate.value).toLocaleString('en-US')
        : '$' + Math.round(value).toLocaleString('en-US'))
    }

    /** Format a dollar amount in the selected currency. */
    function usdText(usd, currency, rate) {
      if (usd === null || usd === undefined) return '—'
      if (currency !== 'CNY') return '$' + Math.round(usd).toLocaleString('en-US')
      return '¥' + Math.round(usd * rate.value).toLocaleString('en-US')
    }

    /** Dollars from a plan price cell ("$20 ／月" -> 20). */
    function planPrice(price) {
      const match = String(price || '').replace(/,/g, '').match(/\$\s*([\d.]+)/)
      return match ? Number(match[1]) : null
    }

    /** Quota in 亿 Token from a cell ("≈ 4.48" -> 4.48), null when the cell is empty. */
    function quotaYi(cell) {
      const value = parseNum(cell)
      return value === null ? null : value
    }

    /* Upstream mixes two period bases in the same catalog: 79 cells quote "亿 Token/周"
       and 70 quote "亿 Token/月". Comparing them directly is off by 52/12 ≈ 4.33x, so
       every number this panel compares is first normalised to a month. */
    const WEEKS_PER_MONTH = 52 / 12

    /* 单元里没写周期时（旧缓存，或上游哪天删掉了那个 span）按厂商兜底。
       这 6 家实测是周，其余 15 家是月；兜底宁可显式写死，也不要默认当月把周额度当成月。 */
    const WEEKLY_PROVIDERS = new Set(['OpenAI', 'Claude', 'Grok', 'Google', 'GLM', 'MiniMax'])

    /** 'week' | 'month' | '' from the unit the site prints inside the cell. */
    function quotaPeriodOf(cell, provider) {
      const unit = String((cell && cell.quotaUnit) || '')
      if (unit) return /周/.test(unit) ? 'week' : /月/.test(unit) ? 'month' : ''
      if (!provider) return ''
      return WEEKLY_PROVIDERS.has(provider) ? 'week' : 'month'
    }

    /** API-equivalent dollars for the cell, converted to a month like the quota. */
    function apiMonthUsd(cell, provider) {
      const usd = parseNum(cell && cell.api)
      if (usd === null) return null
      return quotaPeriodOf(cell, provider) === 'week' ? usd * WEEKS_PER_MONTH : usd
    }

    /** A quota cell in 亿 Token per month, plus the period it was quoted in. */
    function quotaMonthYi(cell, provider) {
      const raw = quotaYi(cell && cell.quota)
      const period = quotaPeriodOf(cell, provider)
      if (raw === null) return { raw: null, month: null, period }
      return { raw, month: period === 'week' ? raw * WEEKS_PER_MONTH : raw, period }
    }

    /* The quota catalog and the leaderboard spell the same model differently
       ("Opus 5.5" vs "Claude Opus 5.5"). Without this the picker lists both, and the
       #1 model on the board has no page at all. Unlisted names are left untouched. */
    const MODEL_ALIAS = {
      'Sonnet 5.5': 'Claude Sonnet 5.5',
      'Opus 5.5': 'Claude Opus 5.5',
      'Fable 5.2': 'Claude Fable 5.2',
      'Fable 5.1': 'Claude Fable 5.1',
      'K3': 'Kimi K3',
      'K3.1 Pro': 'Kimi K3.1 Pro',
      'MiMo V2.6 Flash': 'MiMo-V2.6-Flash',
      'MiMo V2.6 Pro': 'MiMo-V2.6-Pro',
      'DeepSeek V4.1 Flash 1017': 'DeepSeek V4.1 Flash (1017)',
    }

    function modelName(name) {
      return MODEL_ALIAS[name] || name
    }

    /** 亿 Token with the same precision the site uses (2 decimals below 10, else 1/0). */
    function formatYi(value) {
      if (value === null || value === undefined || Number.isNaN(value)) return '—'
      const shown = value >= 10 ? value.toFixed(value >= 100 ? 0 : 1) : value.toFixed(2)
      return shown.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
    }

    /**
     * Flatten the quota payload into one entry per (plan, model) pair — the unit
     * both new tabs work in. `price` is USD, `quotaYi` is 亿 Token.
     */
    function planModelEntries(sections) {
      const out = []
      for (const section of sections) {
        for (const table of section.tables) {
          table.plans.forEach((plan, i) => {
            const price = planPrice(plan.price)
            if (price === null) return
            const models = []
            for (const row of table.rows) {
              const cell = row.cells[i]
              if (!cell) continue
              // a row can exist with an empty quota upstream (5 such cells). Dropping it
              // silently under-counts the plan's coverage, so keep it and mark it unknown.
              const q = quotaMonthYi(cell, section.provider)
              models.push({
                model: modelName(row.model),
                quota: q.month,
                quotaRaw: q.raw,
                quotaPeriod: q.period,
                quotaKnown: q.raw !== null,
                apiNum: apiMonthUsd(cell, section.provider),
                perDollarRaw: cell.perDollar,
                perDollar: perUnitValue(cell.perDollar, 'USD', { value: RATE_FALLBACK }),
              })
            }
            if (models.length === 0) return
            out.push({
              id: section.provider + '|' + plan.name,
              provider: section.provider,
              plan: plan.name,
              priceUsd: price,
              models,
            })
          })
        }
      }
      return out
    }

    /** Every model in the catalog, with the providers that carry it. */
    function modelIndex(entries) {
      const map = new Map()
      for (const entry of entries) {
        for (const item of entry.models) {
          let slot = map.get(item.model)
          if (!slot) { slot = { model: item.model, providers: new Set(), plans: 0 }; map.set(item.model, slot) }
          slot.providers.add(entry.provider)
          slot.plans += 1
        }
      }
      return [...map.values()]
        .map(slot => ({
          model: slot.model,
          providers: [...slot.providers].sort((a, b) => a.localeCompare(b, 'zh')),
          plans: slot.plans,
          group: [...slot.providers].sort((a, b) => a.localeCompare(b, 'zh'))[0] || '',
        }))
        .sort((a, b) => b.plans - a.plans || a.model.localeCompare(b.model, 'zh'))
    }

    /** USD to CNY rate, with a fixed fallback when the service is unreachable. */
    function useRate() {
      const [rate, setRate] = useState({ value: RATE_FALLBACK, source: 'fallback' })
      useEffect(() => {
        let alive = true
        fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })
          .then(response => response.json())
          .then(json => {
            const value = json && json.rates && json.rates.CNY
            if (!alive || typeof value !== 'number' || value < 3 || value > 15) return
            setRate({ value, source: 'live' })
          })
          .catch(() => {})
        return () => { alive = false }
      }, [])
      return rate
    }

    /** Bar color bucket: green for strong, brand for mid, grey for weak. */
    function tone(value) {
      if (typeof value !== 'number') return 'low'
      if (value >= 75) return 'high'
      if (value >= 50) return 'mid'
      return 'low'
    }

    function useFeed(endpoint) {
      const [state, setState] = useState({ loading: true, busy: true, payload: null, error: null })
      const load = useCallback(async (force) => {
        setState(prev => ({ ...prev, busy: true }))
        try {
          const response = await fetch(endpoint + (force ? '?force=1' : ''), { cache: 'no-store' })
          const payload = await response.json()
          setState({ loading: false, busy: false, payload, error: payload && payload.ok === false ? payload.error : null })
        } catch (error) {
          setState(prev => ({ ...prev, loading: false, busy: false, error: String((error && error.message) || error) }))
        }
      }, [endpoint])
      useEffect(() => { void load(false) }, [load])
      return [state, load]
    }

    function Banner({ t, error, payload, onRetry }) {
      if (!error) return null
      const stale = formatTime(payload && payload.fetchedAt)
      return h('div', { className: 'mdlb-banner' },
        h('span', null, t('failed', { error })),
        stale ? h('span', null, ' · ', t('stale', { time: stale })) : null,
        h('button', {
          className: 'mdlb-btn',
          style: { marginLeft: 10, padding: '1px 9px', fontSize: 11 },
          onClick: () => onRetry(true),
        }, t('retry')),
      )
    }

    /** Placeholder rows shown while the first payload is still in flight. */
    function SkeletonRows() {
      const widths = [
        [176, 62, 54, 44, 70, 58, 48],
        [148, 58, 48, 60, 66, 54, 42],
        [186, 48, 64, 38, 62, 58, 50],
        [140, 66, 44, 54, 74, 50, 40],
        [164, 54, 58, 42, 58, 62, 46],
        [152, 60, 50, 58, 68, 52, 44],
        [178, 52, 66, 40, 64, 50, 48],
        [146, 62, 52, 56, 70, 56, 42],
        [170, 56, 46, 48, 60, 58, 46],
      ]
      return h('div', { className: 'mdlb-skel-rows', 'aria-hidden': 'true' },
        widths.map((row, i) => h('div', { key: i, className: 'mdlb-skel-row' },
          h('span', { className: 'mdlb-skel', style: { width: 14, height: 9 } }),
          h('span', { className: 'mdlb-skel', style: { width: row[0], height: 10 } }),
          ...row.slice(1).map((w, j) => h('span', { key: j, className: 'mdlb-skel', style: { width: w, height: 9 } })),
          h('span', { className: 'mdlb-skel', style: { width: 38, height: 9 } }),
          h('span', { className: 'mdlb-skel', style: { width: 34, height: 9 } }),
        )))
    }

    /** 编号章节条：一位数字 + 标题 + 发丝线 + 右侧说明。 */
    function SectionBar({ no, title, right }) {
      return h('div', { className: 'mdlb-sec' },
        h('span', { className: 'mdlb-sec-no' }, no),
        h('span', { className: 'mdlb-sec-ttl' }, title),
        h('span', { className: 'mdlb-sec-line', 'aria-hidden': true }),
        right ? h('span', { className: 'mdlb-sec-rt' }, right) : null,
      )
    }

    /** 前三名的大字报：模型名 + 综合分。固定按排名取，不跟随表格排序。 */
    function Podium({ rows, t }) {
      const top = rows.slice(0, 3)
      if (top.length === 0) return null
      return h('div', { className: 'mdlb-podium' },
        top.map((row, i) => h('div', { key: row.key, className: 'mdlb-pod', 'data-top': String(i < 3) },
          h('div', { className: 'mdlb-pod-no' }, String(row.rank).padStart(2, '0')),
          h('div', { className: 'mdlb-pod-name' }, h('a', {
            href: 'https://modeldial.com/models/' + encodeURIComponent(row.key) + '?axis=overall',
            target: '_blank', rel: 'noreferrer noopener',
          }, row.name)),
          h('div', { className: 'mdlb-pod-score' },
            h('b', null, formatScore(row.overall)),
            h('span', { className: 'mdlb-pod-unit' }, t('colOverall')),
            h('i', { className: 'mdlb-bar' }, h('i', { style: { width: `${Math.max(0, Math.min(100, row.overall || 0))}%` } }))),
          h('div', { className: 'mdlb-pod-meta' },
            row.isNew ? h('span', { className: 'mdlb-chip', 'data-tone': 'new' }, t('newBadge')) : null,
            row.effort ? h('span', { className: 'mdlb-chip' }, row.effort) : null,
            h('span', { className: 'mdlb-pod-detail' }, t('colKnowledge') + ' ' + formatScore(row.knowledge)),
          ),
        )))
    }

    function LeaderboardTable({ rows, t, query, onQuery }) {
      const [sort, setSort] = useState({ key: 'rank', dir: 'asc' })
      const onSort = useCallback(key => {
        setSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'rank' ? 'asc' : 'desc' })
      }, [])
      const sorted = useMemo(() => {
        const copy = rows.slice()
        const dir = sort.dir === 'asc' ? 1 : -1
        /** Column key to the value actually compared; text columns are parsed, not alphabetised. */
        const pick = row => {
          if (sort.key === 'model') return row.name
          if (sort.key === 'duration') return durationMinutes(row.duration)
          if (sort.key === 'cost') return dollarsOf(row.cost)
          if (sort.key === 'released') return Date.parse(row.released) || null
          return row[sort.key]
        }
        copy.sort((a, b) => {
          const x = pick(a)
          const y = pick(b)
          if (sort.key === 'rank') return dir * ((Number(a.rank) || 0) - (Number(b.rank) || 0))
          const xNum = typeof x === 'number'
          const yNum = typeof y === 'number'
          // unknown values ("暂无") always sink to the bottom, whichever way the column is sorted
          if (xNum && !yNum) return -1
          if (!xNum && yNum) return 1
          if (xNum && yNum) return dir * (x - y)
          return dir * String(x || '').localeCompare(String(y || ''), 'zh')
        })
        return copy
      }, [rows, sort])

      const header = (key, label, left) => h('th', {
        key,
        scope: 'col',
        className: left ? 'mdlb-left' : undefined,
        'data-sortable': 'true',
        'data-active': String(sort.key === key),
        onClick: () => onSort(key),
      }, h('span', null, label), sort.key === key ? h('span', { style: { marginLeft: 4, opacity: .7 } }, sort.dir === 'desc' ? '↓' : '↑') : null)

      // 默认视图：前三名上大字报，表格从第 4 名开始，避免同一行数据出现两次。
      // 一旦排序或搜索，大字报就隐藏，表格回到全量，否则标题「前三名」会和排好的次序矛盾。
      const sortedOrFiltered = sort.key !== 'rank' || sort.dir !== 'asc' || Boolean(query && query.trim())
      const topThree = useMemo(() => rows
        .slice()
        .sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0))
        .slice(0, 3), [rows])
      const tableRows = sortedOrFiltered ? sorted : sorted.filter(row => (Number(row.rank) || 0) > 3)

      return h('div', { className: 'mdlb-main' },
        sortedOrFiltered ? null : h(SectionBar, { no: '01', title: t('secTop'), right: t('secTopRight') }),
        sortedOrFiltered ? null : h(Podium, { rows: topThree, t }),
        h(SectionBar, {
          no: sortedOrFiltered ? '01' : '02',
          title: sortedOrFiltered ? t('secAll') : t('secRest'),
          right: t('boardCount', { n: tableRows.length }),
        }),
        h('div', { className: 'mdlb-card' },
          h('div', { className: 'mdlb-card-top' },
            h('div', { className: 'mdlb-toolbar-left' },
              query ? h('span', { className: 'mdlb-count' }, t('boardFiltered', { n: rows.length })) : null,
            ),
            h('input', {
              className: 'mdlb-search',
              type: 'search',
              placeholder: t('searchPlaceholder'),
              value: query,
              onChange: event => onQuery(event.target.value),
            }),
          ),
          h('div', { className: 'mdlb-body' },
            h('table', { className: 'mdlb-table' },
              h('thead', null, h('tr', null,
                header('rank', t('colRank')),
                header('model', t('colModel'), true),
                ...SCORE_COLUMNS.map(([key, label]) => header(key, t(label))),
                header('duration', t('colDuration')),
                header('cost', t('colCost')),
                header('released', t('colReleased')),
              )),
              h('tbody', null, tableRows.length === 0
                ? h('tr', { key: '__empty__' }, h('td', { className: 'mdlb-empty-cell', colSpan: 11 },
                  h('div', { className: 'mdlb-empty' },
                    h('span', { className: 'mdlb-empty-title' }, t('noMatch')),
                    h('span', null, t('noMatchHint')))))
                : tableRows.map((row, i) => h('tr', { key: row.key, style: { '--i': i } },
                h('td', { className: 'mdlb-rank', 'data-top': String(Number(row.rank) <= 3) },
                  h('span', null, row.rank)),
                h('td', { className: 'mdlb-left' }, h('div', { className: 'mdlb-name' },
                  h('a', {
                    href: 'https://modeldial.com/models/' + encodeURIComponent(row.key) + '?axis=overall',
                    target: '_blank',
                    rel: 'noreferrer noopener',
                    // 窄档模型列只有 150~200px，长名字会被省略号截掉，悬停要能看到全名
                    title: row.name,
                  }, row.name),
                  row.isNew ? h('span', { className: 'mdlb-chip', 'data-tone': 'new' }, t('newBadge')) : null,
                  row.effort
                    ? h('span', { className: 'mdlb-chip', title: row.effortCount ? '共 ' + row.effortCount + ' 个档位，本行是最优档' : undefined },
                      row.effort + (row.effortCount ? ' · ' + row.effortCount + ' 档' : ''))
                    : null,
                )),
                ...SCORE_COLUMNS.map(([key]) => h('td', { key },
                  h('span', { className: key === 'overall' ? 'mdlb-score mdlb-main-score' : 'mdlb-score' },
                    h('span', null, formatScore(row[key])),
                    h('i', { className: 'mdlb-bar', 'data-tone': tone(row[key]) },
                      h('i', { style: { width: `${Math.max(0, Math.min(100, row[key] || 0))}%` } })),
                  ))),
                h('td', { className: 'mdlb-muted' }, row.duration || '—'),
                h('td', { className: 'mdlb-muted' }, row.cost || '—'),
                // 发布日期判断「新的值不值得换」；上游 54/54 都有，只是此前没渲染
                h('td', { className: 'mdlb-muted mdlb-date', title: row.released || undefined },
                  row.released ? row.released.slice(5) : '—'),
              ))),
            ),
          ),
        ),
      )
    }

    /** One quota matrix cell: the month-normalised figure on top, API value or per-unit below. */
    function quotaCell(cell, key, { t, currency, rate, provider }) {
      const q = quotaMonthYi(cell, provider)
      // 上游这一格按周给额度时，表里显示折月后的数，原值留在 tooltip
      // 空额度不给折算提示：会拼出「上游按周给 ，已按…」这种残句
      const note = q.period === 'week' && q.raw !== null
        ? '上游按周给 ' + cell.quota + '，已按 52/12 折成月'
        : undefined
      const line1 = h('b', null, q.raw === null ? '—' : '≈ ' + formatYi(q.month))
      // 上游有时不写数字而写一句话（「共用月池上限…」）：留在 tooltip，副行退回单位价格
      const apiUsd = apiMonthUsd(cell, provider)
      const line2 = apiUsd !== null
        ? h('small', null, t('apiValue', { value: usdText(apiUsd, currency, rate) }))
        : h('small', {
          title: cell.api || cell.perDollar || undefined,
          'data-qualifier': String(!cell.api && !cell.perDollar),
        }, cell.perDollar ? perUnitText(cell.perDollar, currency, rate) : '—')
      return h('td', { key },
        h('div', {
          className: 'mdlb-cell',
          title: note || (cell.perDollar ? perUnitText(cell.perDollar, currency, rate) : undefined),
        }, line1, line2))
    }

    function QuotaTable({ sections, t, currency, onCurrency, rate }) {
      // 默认停在「全部」：KPI 说 68 个套餐，只显示一家、7 行，数字和表对不上
      const [provider, setProvider] = useState('*')
      const allPlans = useMemo(() => sections.reduce((n, s) => n + s.tables.reduce((m, tb) => m + tb.plans.length, 0), 0), [sections])
      const current = useMemo(() => {
        if (sections.length === 0) return null
        if (provider === '*') return null
        return sections.find(s => s.provider === provider) || sections[0]
      }, [sections, provider])

      if (sections.length === 0) return null

      // 「全部」视图：每家一段，只列出该家在售的套餐，不做跨家横向对比
      // （不同厂商的套餐名不可比，硬拼成一张表会误导）
      const blocks = provider === '*'
        ? sections.flatMap(s => s.tables.map(tb => ({ provider: s.provider, table: tb })))
        : [{ provider: current.provider, table: current.tables[0] }]

      return h('div', { className: 'mdlb-main' },
        h(SectionBar, { no: '01', title: t('secMatrix'), right: t('secMatrixRight') }),
        h('div', { className: 'mdlb-card' },
          h('div', { className: 'mdlb-card-top' },
            h('div', { className: 'mdlb-toolbar-left' },
              h('div', { className: 'mdlb-providers' },
                h('button', {
                  key: '*',
                  className: 'mdlb-provider',
                  'data-active': String(provider === '*'),
                  onClick: () => setProvider('*'),
                }, t('allProviders') + ' · ' + allPlans),
                sections.map(s => h('button', {
                  key: s.provider,
                  className: 'mdlb-provider',
                  'data-active': String(provider === s.provider),
                  onClick: () => setProvider(s.provider),
                }, s.provider)),
              ),
            ),
            h('div', { className: 'mdlb-toolbar-right' },
              h('span', { className: 'mdlb-count' }, t('quotaCoverage', { p: sections.length, n: allPlans })),
              h(CurrencySwitch, { currency, onCurrency, rate, t }),
            ),
          ),
          blocks.map(({ provider: name, table }) => h('div', { key: name + '|' + (table.caption || ''), className: 'mdlb-quota-block' },
            provider === '*'
              ? h('p', { className: 'mdlb-quota-title' },
                h('b', null, name),
                h('span', null, ' · ' + table.plans.length + ' 个套餐'))
              : null,
            table.caption
              ? h('p', { className: 'mdlb-caption' },
                table.caption
                  .replace(/横向查看套餐.*$/, '')
                  .replace(/USD|CNY/g, currency)
                  .replace(/每\s*\$1/g, currency === 'CNY' ? '每 ¥1' : '每 $1')
                  .trim())
              : null,
            h('div', { className: 'mdlb-body' },
              h('table', { className: 'mdlb-table', 'data-wide': 'true' },
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'mdlb-left' }, t('model')),
                  ...table.plans.map(plan => h('th', { key: plan.name, scope: 'col' },
                    h('div', { className: 'mdlb-plan-head' },
                      h('span', { className: 'mdlb-plan-name' }, plan.name),
                      h('span', { className: 'mdlb-plan-price' },
                        t('planPrice', { price: priceText(plan.price, currency, rate) })),
                    ))),
                )),
                h('tbody', null, table.rows.map((row, i) => h('tr', { key: row.model, style: { '--i': i } },
                  h('td', { className: 'mdlb-left' }, modelName(row.model)),
                  ...row.cells.map((cell, j) => quotaCell(cell, j, { t, currency, rate, provider: name })),
                ))),
              ),
            ),
          )),
        ),
      )
    }

    function ValueTable({ rows, t, currency, onCurrency, rate, provider, onProvider }) {
      const providers = useMemo(() => [...new Set(rows.map(r => r.provider))], [rows])
      const filtered = useMemo(() => provider === '*' ? rows : rows.filter(r => r.provider === provider), [rows, provider])
      const max = useMemo(() => filtered.reduce((m, r) => Math.max(m, r.perDollar), 0), [filtered])

      return h('div', { className: 'mdlb-main' },
        h(SectionBar, { no: '01', title: t('secValue'), right: t('comboCount', { n: filtered.length }) }),
        h('div', { className: 'mdlb-card' },
          h('div', { className: 'mdlb-card-top' },
            h('div', { className: 'mdlb-toolbar-left' },
              h('button', { className: 'mdlb-provider', 'data-active': String(provider === '*'), onClick: () => onProvider('*') }, t('allProviders')),
              providers.map(p => h('button', {
                key: p,
                className: 'mdlb-provider',
                'data-active': String(provider === p),
                onClick: () => onProvider(p),
              }, p)),
            ),
            h('div', { className: 'mdlb-toolbar-right' },
              h(CurrencySwitch, { currency, onCurrency, rate, t }),
            ),
          ),
          h('div', { className: 'mdlb-body' },
            h('table', { className: 'mdlb-table', 'data-wide': 'true' },
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', className: 'mdlb-left' }, t('colPlan')),
                h('th', { scope: 'col', className: 'mdlb-left' }, t('colModel')),
                h('th', { scope: 'col' }, t('colWeekly')),
                h('th', { scope: 'col' }, t('colApi')),
                h('th', { scope: 'col' }, currency === 'CNY' ? t('colPerYuan') : t('colPerDollar')),
              )),
              h('tbody', null, filtered.map((row, i) => h('tr', { key: row.id, style: { '--i': i } },
                h('td', { className: 'mdlb-left' },
                  h('div', { className: 'mdlb-plan-cell' },
                    h('span', { className: 'mdlb-plan-name' }, row.plan),
                    h('span', { className: 'mdlb-plan-meta' }, row.provider + ' · ' + priceText(row.price, currency, rate)),
                  )),
                h('td', { className: 'mdlb-left mdlb-muted' }, row.model),
                h('td', null, row.quota),
                h('td', { className: 'mdlb-muted' }, row.apiNum === null ? '—' : usdText(row.apiNum, currency, rate)),
                h('td', null, h('span', { className: 'mdlb-score mdlb-main-score' },
                  h('span', null, (() => {
                    const value = perUnitValue(row.perDollarRaw || ('每 $1 ≈ ' + row.perDollar + ' 万'), currency, rate)
                    if (value === null) return '—'
                    return (value >= 100 ? Math.round(value) : Math.round(value * 10) / 10).toLocaleString('en-US')
                  })()),
                  h('i', { className: 'mdlb-bar', 'data-tone': tone(max ? (row.perDollar / max) * 100 : 0) },
                    h('i', { style: { width: `${max ? Math.max(2, Math.min(100, (row.perDollar / max) * 100)) : 0}%` } })),
                )),
              ))),
            ),
          ),
        ),
      )
    }

    /** Tab 4: pick one model, see every plan that carries it. */
    function ModelTable({ entries, t, currency, onCurrency, rate }) {
      const index = useMemo(() => modelIndex(entries), [entries])
      const [picked, setPicked] = useState(null)
      const [query, setQuery] = useState('')
      const [sort, setSort] = useState('best')

      // search narrows the selector; a filter that still contains the current pick keeps it
      const needle = query.trim().toLowerCase()
      const shown = useMemo(() => needle
        ? index.filter(m => (m.model + ' ' + m.group).toLowerCase().includes(needle))
        : index, [index, needle])

      // falling back to index[0] on an empty result would keep rendering the previous model
      const current = shown.length === 0
        ? null
        : (picked && shown.some(m => m.model === picked) ? picked : shown[0].model)

      // one <optgroup> per provider so the 30 models read as groups, not a flat list
      const groups = useMemo(() => {
        const map = new Map()
        for (const item of shown) {
          if (!map.has(item.group)) map.set(item.group, [])
          map.get(item.group).push(item)
        }
        return [...map.entries()]
      }, [shown])

      const rows = useMemo(() => {
        if (!current) return []
        const out = []
        for (const entry of entries) {
          const item = entry.models.find(m => m.model === current)
          if (!item) continue
          out.push({
            id: entry.id,
            provider: entry.provider,
            plan: entry.plan,
            priceUsd: entry.priceUsd,
            quota: item.quota,
            quotaKnown: item.quotaKnown,
            apiNum: item.apiNum,
            perDollarRaw: item.perDollarRaw,
            perDollar: item.perDollar,
          })
        }
        // progress bars grow against this model's own best offer, not the global maximum
        return out.sort(sort === 'best'
          ? (a, b) => (b.perDollar || 0) - (a.perDollar || 0) || a.priceUsd - b.priceUsd
          : (a, b) => a.priceUsd - b.priceUsd)
      }, [entries, current, sort])

      const max = useMemo(() => rows.reduce((m, r) => Math.max(m, r.perDollar || 0), 0), [rows])
      const coverage = index.find(m => m.model === current)
      // 14 of 30 models carry no API-equivalent figure upstream; an all-dash column is noise
      const hasApi = useMemo(() => rows.some(r => r.apiNum !== null), [rows])

      if (index.length === 0) {
        return h('div', { className: 'mdlb-main' }, h('div', { className: 'mdlb-card' },
          h('div', { className: 'mdlb-empty' }, t('empty'), h('span', null, t('emptyHint')))))
      }

      return h('div', { className: 'mdlb-main' },
        h(SectionBar, { no: '01', title: t('secModel'), right: coverage ? t('modelCoverage', { p: coverage.providers.length, r: coverage.plans }) : null }),
        h('div', { className: 'mdlb-card' },
          h('div', { className: 'mdlb-card-top' },
            h('div', { className: 'mdlb-toolbar-left' },
              h('label', { className: 'mdlb-field' }, t('pickModel'),
                h('input', {
                  className: 'mdlb-search',
                  type: 'search',
                  placeholder: t('searchPlaceholder'),
                  value: query,
                  onChange: event => setQuery(event.target.value),
                }),
                h('select', {
                  className: 'mdlb-select',
                  value: current || '',
                  onChange: event => setPicked(event.target.value),
                }, groups.length === 0
                  ? h('option', { value: '', disabled: true }, t('noMatch'))
                  : groups.map(([group, list]) => h('optgroup', { key: group, label: group },
                    list.map(m => h('option', { key: m.model, value: m.model },
                      m.model + ' · ' + m.providers.length + ' 家'))))),
              ),

              coverage && coverage.providers.length === 1
                ? h('span', { className: 'mdlb-notice' }, t('soloNotice', { p: coverage.providers[0] }))
                : null,
            ),
            h('div', { className: 'mdlb-toolbar-right' },
              h('div', { className: 'mdlb-seg' },
                h('button', { className: 'mdlb-seg-btn', 'data-active': String(sort === 'best'), onClick: () => setSort('best') }, t('sortBest')),
                h('button', { className: 'mdlb-seg-btn', 'data-active': String(sort === 'cheap'), onClick: () => setSort('cheap') }, t('sortCheap')),
              ),
              h(CurrencySwitch, { currency, onCurrency, rate, t }),
            ),
          ),
          rows.length === 0
            ? h('div', { className: 'mdlb-empty' },
              shown.length === 0 ? t('noMatch') : t('noPlanForModel'),
              h('span', null, shown.length === 0 ? t('noMatchHint') : t('noPlanForModelHint')))
            : h('div', { className: 'mdlb-body' },
              h('table', { className: 'mdlb-table', 'data-wide': 'true' },
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'mdlb-left' }, t('colVendor')),
                  h('th', { scope: 'col', className: 'mdlb-left' }, t('colPlan')),
                  h('th', { scope: 'col' }, t('colQuotaOfModel')),
                  hasApi ? h('th', { scope: 'col' }, t('colApi')) : null,
                  h('th', { scope: 'col' }, currency === 'CNY' ? t('colPerYuan') : t('colPerDollar')),
                )),
                h('tbody', null, rows.map((row, i) => h('tr', { key: row.id, style: { '--i': i } },
                  h('td', { className: 'mdlb-left' }, row.provider),
                  h('td', { className: 'mdlb-left' }, h('div', { className: 'mdlb-plan-cell' },
                    h('span', { className: 'mdlb-plan-name' }, row.plan),
                    h('span', { className: 'mdlb-plan-meta' },
                      priceText('$' + row.priceUsd, currency, rate) + ' / ' + t('perMonthUnit')),
                  )),
                  h('td', null, row.quotaKnown === false ? '—' : '≈ ' + formatYi(row.quota)),
                  hasApi
                    ? h('td', { className: 'mdlb-muted' }, row.apiNum === null ? '—' : usdText(row.apiNum, currency, rate))
                    : null,
                  h('td', null, h('span', { className: 'mdlb-score mdlb-main-score' },
                    h('span', null, row.perDollar === null ? '—'
                      : (() => {
                        const v = perUnitValue(row.perDollarRaw, currency, rate)
                        if (v === null) return '—'
                        return (v >= 100 ? Math.round(v) : Math.round(v * 10) / 10).toLocaleString('en-US')
                      })()),
                    h('i', { className: 'mdlb-bar', 'data-tone': max ? 'mid' : 'low' },
                      h('i', { style: { width: `${max ? Math.max(2, Math.min(100, ((row.perDollar || 0) / max) * 100)) : 0}%` } })),
                  )),
                ))),
              ),
            ),
        ),
      )
    }

    /** Tab 5: what a monthly budget buys, and whether it lasts a month at a given usage. */
    function BudgetTable({ entries, t, currency, onCurrency, rate }) {
      // the budget is kept in USD and only rendered in the active currency, so
      // switching back and forth cannot drift and never re-reads a CNY number as USD
      const [budgetUsd, setBudgetUsd] = useState(null)
      const [usage, setUsage] = useState('')
      const [open, setOpen] = useState(null)

      const showBudget = (usd) => usd === null
        ? ''
        : currency === 'CNY'
          ? String(Math.round(usd * rate.value))
          : String(Math.round(usd * 100) / 100)

      const onBudgetInput = (text) => {
        const parsed = parseFloat(text)
        if (!Number.isFinite(parsed) || parsed < 0) { setBudgetUsd(null); return }
        setBudgetUsd(currency === 'CNY' ? parsed / rate.value : parsed)
      }

      const effectiveBudgetUsd = budgetUsd === null ? 20 : budgetUsd
      const usageYi = (() => {
        const parsed = parseFloat(usage)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null
      })()

      const hits = useMemo(() => entries
        .filter(entry => entry.priceUsd <= effectiveBudgetUsd + 0.005)
        .sort((a, b) => a.priceUsd - b.priceUsd), [entries, effectiveBudgetUsd])

      const cheapest = useMemo(() => entries.reduce((m, e) => (m === null || e.priceUsd < m ? e.priceUsd : m), null), [entries])

      const summary = useMemo(() => {
        if (usageYi === null) return null
        // Classify PER MODEL, never per (plan x model) cell: one model sits in several
        // plans, so counting cells made a model show up as both unknown and short.
        // Rule: every cell unknown -> unknown; any cell lasts -> ok; else -> short.
        const cellsPerModel = new Map()
        let planCount = 0
        for (const entry of hits) {
          let entryOk = 0
          for (const item of entry.models) {
            let bucket = cellsPerModel.get(item.model)
            if (!bucket) { bucket = []; cellsPerModel.set(item.model, bucket) }
            bucket.push(item.quotaKnown === false ? null : item.quota)
            if (item.quotaKnown !== false && item.quota / usageYi >= 1) entryOk += 1
          }
          if (entryOk > 0) planCount += 1
        }
        let okModels = 0
        let badModels = 0
        let unknown = 0
        for (const quotas of cellsPerModel.values()) {
          if (quotas.every(q => q === null)) { unknown += 1; continue }
          if (quotas.some(q => q !== null && q / usageYi >= 1)) okModels += 1
          else badModels += 1
        }
        return { allModels: cellsPerModel.size, okModels, badModels, unknown, planCount }
      }, [hits, usageYi])

      const money = (usd) => currency === 'CNY'
        ? '¥' + Math.round(usd * rate.value).toLocaleString('en-US')
        : '$' + (usd % 1 === 0 ? usd : usd.toFixed(2))

      return h('div', { className: 'mdlb-main' },
        h(SectionBar, { no: '01', title: t('secBudget'), right: t('budgetHit', { n: hits.length }) }),
        h('div', { className: 'mdlb-card' },
          h('div', { className: 'mdlb-card-top' },
            h('div', { className: 'mdlb-toolbar-left' },
              h('label', { className: 'mdlb-field' }, t('budgetLabel'),
                h('span', { className: 'mdlb-affix' }, currency === 'CNY' ? '¥' : '$'),
                h('input', {
                  className: 'mdlb-num', type: 'number', min: 0, step: 1,
                  value: showBudget(budgetUsd),
                  placeholder: showBudget(20),
                  onChange: event => onBudgetInput(event.target.value),
                }),
              ),
              h('label', { className: 'mdlb-field' }, t('usageLabel'),
                h('input', {
                  className: 'mdlb-num', type: 'number', min: 0, step: 1,
                  value: usage,
                  placeholder: t('usagePlaceholder'),
                  onChange: event => setUsage(event.target.value),
                }),
                h('span', { className: 'mdlb-affix' }, t('usageUnit')),
                h('span', { className: 'mdlb-affix mdlb-optional' }, t('usageOptional')),
              ),
            ),
            h('div', { className: 'mdlb-toolbar-right' },
              h(CurrencySwitch, { currency, onCurrency, rate, t }),
            ),
          ),
          summary
            ? h('div', { className: 'mdlb-summary' },
              h('span', null,
                summary.badModels === 0 && summary.unknown === 0
                  ? t('usageSummary', { ok: summary.okModels, all: summary.allModels })
                  : t('usageSummaryBad', {
                    ok: summary.okModels,
                    bad: summary.badModels,
                    unknown: summary.unknown,
                  })),
              h('span', { className: 'mdlb-note' },
                '· ' + t('usagePlanCount', { ok: summary.planCount, all: hits.length })),
            )
            : null,
          hits.length === 0
            ? h('div', { className: 'mdlb-empty' }, t('budgetNone'),
              h('span', null, t('budgetNoneHint', { price: money(cheapest || 0) })))
            : h('div', { className: 'mdlb-body' },
              h('table', { className: 'mdlb-table', 'data-wide': 'true' },
                h('thead', null, h('tr', null,
                  h('th', { scope: 'col', className: 'mdlb-left' }, t('colVendor')),
                  h('th', { scope: 'col', className: 'mdlb-left' }, t('colPlan')),
                  h('th', { scope: 'col', className: 'mdlb-left mdlb-cover-col' }, t('colCover')),
                  usageYi !== null ? h('th', { scope: 'col' }, t('colEnough')) : null,
                )),
                h('tbody', null, hits.map((entry, i) => {
                  const known = entry.models.filter(m => m.quotaKnown !== false)
                  const unknownCount = entry.models.length - known.length
                  const okCount = usageYi === null ? null : known.filter(m => m.quota / usageYi >= 1).length
                  const badNames = usageYi === null ? [] : known.filter(m => m.quota / usageYi < 1).map(m => m.model)
                  // ratio over models with a known quota only: "0 / 2 + 1 个不够" in a 2-model
                  // plan read as a contradiction when the second model had no quota upstream
                  const ratio = usageYi === null || known.length === 0 ? 0 : okCount / known.length
                  const expanded = open === entry.id
                  return [
                    h('tr', { key: entry.id, style: { '--i': i } },
                      h('td', { className: 'mdlb-left' }, entry.provider),
                      h('td', { className: 'mdlb-left' }, h('div', { className: 'mdlb-plan-cell' },
                        h('span', { className: 'mdlb-plan-name' }, entry.plan),
                        h('span', { className: 'mdlb-plan-meta' }, money(entry.priceUsd) + ' / ' + t('perMonthUnit')),
                      )),
                      h('td', { className: 'mdlb-left mdlb-cover-col' },
                        h('div', { className: 'mdlb-cover' },
                          entry.models.map(m => h('span', {
                            key: m.model,
                            className: 'mdlb-chip',
                            'data-unknown': String(m.quotaKnown === false),
                            title: m.quotaKnown === false ? m.model + ' · ' + t('quotaUnknown') : undefined,
                          }, m.model)),
                        )),
                      usageYi !== null
                        ? h('td', null, h('div', { className: 'mdlb-enough' },
                          h('span', { className: 'mdlb-goods' }, okCount + ' / ' + known.length),
                          h('i', { className: 'mdlb-mini', 'data-tone': known.length === 0 ? 'mid' : ratio >= 1 ? 'good' : ratio > 0 ? 'mid' : 'bad' },
                            h('i', { style: { width: ratio > 0 ? `${Math.max(2, Math.round(ratio * 100))}%` : '0%' } })),
                          badNames.length > 0
                            ? h('span', { className: 'mdlb-badpill', title: badNames.join('、') }, badNames.length + ' 个不够')
                            : null,
                          unknownCount > 0
                            ? h('span', { className: 'mdlb-badpill', 'data-kind': 'unknown', title: t('quotaUnknown') },
                              unknownCount + ' 个' + t('quotaUnknown'))
                            : null,
                          h('button', {
                            className: 'mdlb-rowbtn',
                            onClick: () => setOpen(expanded ? null : entry.id),
                          }, expanded ? t('collapseDetail') : t('expandDetail')),
                        ))
                        : null,
                    ),
                    expanded
                      ? h('tr', { key: entry.id + ':detail', className: 'mdlb-detail' },
                        h('td', { colSpan: usageYi !== null ? 4 : 3, className: 'mdlb-left' },
                          h('div', { className: 'mdlb-detail-list' },
                            entry.models.map(m => {
                              const known = m.quotaKnown !== false
                              const months = (usageYi === null || !known) ? null : m.quota / usageYi
                              const bad = months !== null && months < 1
                              return h('span', { key: m.model, className: 'mdlb-detail-item', 'data-bad': String(bad), 'data-unknown': String(!known) },
                                h('span', null, m.model),
                                known
                                  ? h('b', null, '≈ ' + formatYi(m.quota) + ' 亿/月')
                                  : h('span', { className: 'mdlb-unknown-tag' }, t('quotaUnknown')),
                                months !== null
                                  ? h('span', { className: 'mdlb-goods' },
                                    months >= 1 ? t('monthsValue', { v: Math.floor(months) }) : t('monthsValue', { v: months.toFixed(2) }))
                                  : null,
                              )
                            }),
                          ),
                        ))
                      : null,
                  ]
                })),
              ),
            ),
        ),
      )
    }

    function CurrencySwitch({ currency, onCurrency, rate, t }) {
      return h('div', { className: 'mdlb-cur' },
        h('div', { className: 'mdlb-seg' },
          h('button', { className: 'mdlb-seg-btn', 'data-active': String(currency === 'USD'), onClick: () => onCurrency('USD') }, '$ USD'),
          h('button', { className: 'mdlb-seg-btn', 'data-active': String(currency === 'CNY'), onClick: () => onCurrency('CNY') }, '¥ CNY'),
        ),
        currency === 'CNY'
          ? h('span', { className: 'mdlb-rate', title: t('rateHint') }, '×' + rate.value.toFixed(2) + (rate.source === 'live' ? '' : ' ' + t('estimate')))
          : null,
      )
    }

    /** Translate function bound by `apply`; the slot also passes its own `t` prop. */
    let translate = key => key

    function Page(props) {
      const t = props && typeof props.t === 'function' ? props.t : translate
      const [tab, setTab] = useState('board')
      /* 整页滚动后，切页签要把滚动位置回到顶部：否则从性价比往下翻到一半再切回榜单，
         会落在榜单中部，看不到刊头和前三名（原来内层滚动时这也是同样的问题，
         只是窗口小、不容易发现） */
      const rootRef = useRef(null)
      useEffect(() => { if (rootRef.current) rootRef.current.scrollTop = 0 }, [tab])

      /* 指针处的洞：pointermove 触发极密，直接写 style 会让 149 行的表掉帧，
         所以只记坐标、用 rAF 合并成每帧最多一次写入；减动效时干脆不留洞 */
      const pointerRef = useRef({ x: -1, y: -1, frame: 0 })
      useEffect(() => {
        const root = rootRef.current
        if (!root) return undefined
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
        const write = () => {
          pointerRef.current.frame = 0
          const p = pointerRef.current
          if (p.x < 0) {
            root.style.setProperty('--mdlb-mx', '-9999px')
            root.style.setProperty('--mdlb-my', '-9999px')
            return
          }
          root.style.setProperty('--mdlb-mx', p.x + 'px')
          root.style.setProperty('--mdlb-my', p.y + 'px')
        }
        const schedule = () => {
          if (!pointerRef.current.frame) pointerRef.current.frame = window.requestAnimationFrame(write)
        }
        const onMove = event => {
          if (reduce.matches) return
          /* 洞画在 sticky 的纸上，纸钉在视口上，所以直接用视口坐标；
             叠加 scrollTop 会让那块空当随滚动越拖越偏 */
          const box = root.getBoundingClientRect()
          const p = pointerRef.current
          p.x = event.clientX - box.left
          p.y = event.clientY - box.top
          schedule()
        }
        const onLeave = () => {
          pointerRef.current.x = -1
          schedule()
        }
        root.addEventListener('pointermove', onMove, { passive: true })
        root.addEventListener('pointerleave', onLeave)
        return () => {
          root.removeEventListener('pointermove', onMove)
          root.removeEventListener('pointerleave', onLeave)
          if (pointerRef.current.frame) window.cancelAnimationFrame(pointerRef.current.frame)
        }
      }, [])
      const [modelSort, setModelSort] = useState('best')
      const [currency, setCurrency] = useState('USD')
      const [provider, setProvider] = useState('*')
      const [query, setQuery] = useState('')
      const rate = useRate()
      const [board, loadBoard] = useFeed('/__modeldial/leaderboard')
      const [quota, loadQuota] = useFeed('/__modeldial/quota')
      const usesQuota = tab === 'quota' || tab === 'value' || tab === 'model' || tab === 'budget'
      const active = usesQuota ? quota : board
      const load = usesQuota ? loadQuota : loadBoard
      const payload = active.payload
      const busy = active.busy
      const fetchedAt = formatTime(payload && payload.fetchedAt)
      const boardRows = useMemo(() => (board.payload && board.payload.data) || [], [board.payload])
      const sections = useMemo(() => (quota.payload && quota.payload.data) || [], [quota.payload])

      const entries = useMemo(() => planModelEntries(sections), [sections])

      // 刊头四个大字必须是实算的：上游目录一变（多加一家厂商、多一个套餐）就要跟着变。
      const coverage = useMemo(() => ({
        providers: sections.length,
        plans: sections.reduce((n, s) => n + s.tables.reduce((m, tb) => m + tb.plans.length, 0), 0),
        models: new Set(entries.flatMap(e => e.models.map(m => m.model))).size,
        combos: entries.reduce((n, e) => n + e.models.filter(m => m.perDollar !== null).length, 0),
      }), [sections, entries])

      /* 榜单页的两格 KPI 不能用额度目录的数字：榜单 54 行、额度侧 28 个模型名，
         把 28 放在「同屏写着 51 个模型」的榜单上，用户第一眼就以为数据少了。
         所以按页签取词：榜单说榜单的行数与组合，其余页签说额度目录。 */
      const kpis = useMemo(() => (tab === 'board'
        ? [['models', 'kpiBoardModels', boardRows.length], ['fresh', 'kpiBoardNew', boardRows.filter(r => r.isNew).length]]
        : [['models', 'kpiModels', coverage.models], ['combos', 'kpiCombos', coverage.combos]]), [tab, boardRows, coverage])

      const valueRows = useMemo(() => {
        const out = []
        for (const section of sections) {
          for (const table of section.tables) {
            table.rows.forEach(row => {
              row.cells.forEach((cell, i) => {
                const plan = table.plans[i]
                if (!plan) return
                const per = parseNum(cell.perDollar)
                if (per === null) return
                const q = quotaMonthYi(cell, section.provider)
                out.push({
                  id: section.provider + '|' + plan.name + '|' + row.model,
                  provider: section.provider,
                  plan: plan.name,
                  price: plan.price,
                  model: modelName(row.model),
                  quota: q.raw === null ? '—' : '≈ ' + formatYi(q.month),
                  quotaPeriod: q.period,
                  apiNum: apiMonthUsd(cell, section.provider),
                  perDollar: per,
                  perDollarRaw: cell.perDollar,
                })
              })
            })
          }
        }
        return out.sort((a, b) => b.perDollar - a.perDollar)
      }, [sections])

      const body = useMemo(() => {
        /* 抓取失败且一个数据都没有：不要再摆一块「还没有数据」跟 banner 抢注意力，
           banner 已经写了失败原因和「重试」。有旧数据（stale）时照常显示表格 */
        if (active.error && !(payload && payload.data && payload.data.length)) return null
        if (active.loading && !payload) {
          return h('div', { className: 'mdlb-main' },
            h('div', { className: 'mdlb-card' },
              h('div', { className: 'mdlb-card-top' },
                h('span', { className: 'mdlb-skel', style: { width: 64, height: 10 } }),
                h('span', { className: 'mdlb-skel', style: { width: 190, height: 28 } }),
              ),
              h('div', { className: 'mdlb-body' }, h(SkeletonRows, null)),
            ),
          )
        }
        if (tab === 'board') {
          const filtered = query.trim()
            ? boardRows.filter(r => (r.name + ' ' + r.effort).toLowerCase().includes(query.trim().toLowerCase()))
            : boardRows
          if (boardRows.length === 0) {
            return h('div', { className: 'mdlb-main' }, h('div', { className: 'mdlb-card' },
              h('div', { className: 'mdlb-empty' }, t('empty'), h('span', null, t('emptyHint')))))
          }
          return h(LeaderboardTable, { rows: filtered, total: boardRows.length, t, query, onQuery: setQuery })
        }
        if (tab === 'model') {
          if (sections.length === 0) {
            return h('div', { className: 'mdlb-main' }, h('div', { className: 'mdlb-card' },
              h('div', { className: 'mdlb-empty' }, t('empty'), h('span', null, t('emptyHint')))))
          }
          return h(ModelTable, { entries, t, currency, onCurrency: setCurrency, rate })
        }
        if (tab === 'budget') {
          if (sections.length === 0) {
            return h('div', { className: 'mdlb-main' }, h('div', { className: 'mdlb-card' },
              h('div', { className: 'mdlb-empty' }, t('empty'), h('span', null, t('emptyHint')))))
          }
          return h(BudgetTable, { entries, t, currency, onCurrency: setCurrency, rate })
        }
        if (tab === 'value') {
          if (valueRows.length === 0) {
            return h('div', { className: 'mdlb-main' }, h('div', { className: 'mdlb-card' },
              h('div', { className: 'mdlb-empty' }, t('empty'), h('span', null, t('emptyHint')))))
          }
          return h(ValueTable, { rows: valueRows, t, currency, onCurrency: setCurrency, rate, provider, onProvider: setProvider })
        }
        if (sections.length === 0) {
          return h('div', { className: 'mdlb-main' }, h('div', { className: 'mdlb-card' },
            h('div', { className: 'mdlb-empty' }, t('empty'), h('span', null, t('emptyHint')))))
        }
        return h(QuotaTable, { sections, t, currency, onCurrency: setCurrency, rate })
      }, [active.loading, payload, tab, t, query, boardRows, sections, valueRows, entries, currency, provider, rate])

      return h('div', { className: 'mdlb-root', ref: rootRef },
        h('style', { key: 'mdlb-style' }, CSS),
        h('div', { key: 'mdlb-paper', className: 'mdlb-paper', 'aria-hidden': 'true' }),
        h('div', { key: 'mdlb-sheen', className: 'mdlb-sheen', 'aria-hidden': 'true' }),
        h('div', { className: 'mdlb-head' },
          h('div', { className: 'mdlb-mast' },
            h('h1', { className: 'mdlb-eyebrow' }, t('title')),
            coverage.providers > 0
              ? h('div', { className: 'mdlb-lede', 'aria-label': t('lede') },
                h('b', null, String(coverage.providers)),
                h('em', null, t('ledeProviders')),
                h('span', { className: 'mdlb-lede-rule', 'aria-hidden': true }),
                h('b', null, String(coverage.plans)),
                h('em', null, t('ledePlans')),
              )
              : null,
            h('p', { className: 'mdlb-sub' }, tab === 'board'
              ? t('boardSub')
              : tab === 'quota'
                ? t('quotaSub')
                : tab === 'model'
                  ? t('modelSub')
                  : tab === 'budget'
                    ? t('budgetSub')
                    : t(currency === 'CNY' ? 'valueSubCny' : 'valueSub')),
          ),
          h('div', { className: 'mdlb-actions' },
            fetchedAt ? h('span', { className: 'mdlb-time', 'data-stale': String(!active.error ? false : true) },
              t('updated', { time: fetchedAt }),
              payload && payload.cached ? ` · ${t('cached')}` : '',
            ) : null,
            h('button', {
              className: 'mdlb-btn',
              disabled: busy,
              onClick: () => { void load(true) },
              title: t('refresh'),
            },
            h('svg', { width: 13, height: 13, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
              h('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }),
              h('path', { d: 'M21 3v6h-6' }),
            ),
            h('span', null, busy ? t('refreshing') : t('refresh'))),
          ),
        ),
        h('div', { className: 'mdlb-tabs' },
          h('button', { className: 'mdlb-tab', 'data-active': String(tab === 'board'), onClick: () => setTab('board') }, t('tabBoard')),
          h('button', { className: 'mdlb-tab', 'data-active': String(tab === 'quota'), onClick: () => setTab('quota') }, t('tabQuota')),
          h('button', { className: 'mdlb-tab', 'data-active': String(tab === 'value'), onClick: () => setTab('value') }, t('tabValue')),
          h('button', { className: 'mdlb-tab', 'data-active': String(tab === 'model'), onClick: () => setTab('model') }, t('tabModel')),
          h('button', { className: 'mdlb-tab', 'data-active': String(tab === 'budget'), onClick: () => setTab('budget') }, t('tabBudget')),
        ),
        coverage.providers > 0
          ? h('div', { className: 'mdlb-kpis' },
            kpis.map(([key, label, value]) => h('div', { key, className: 'mdlb-kpi' },
              h('div', { className: 'mdlb-kpi-n' }, String(value)),
              h('div', { className: 'mdlb-kpi-l' }, t(label)),
            )))
          : null,
        h(Banner, { t, error: active.error, payload, onRetry: load }),
        // key 跟着页签走：切页时整块重新挂载，.mdlb-main 的入场动效才会重放；
        // 用 Fragment 而不是包一层 div，免得打乱 flex 布局
        h(React.Fragment, { key: tab }, body),
      )
    }

    function PanelIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 20
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round',
        'aria-hidden': true, style: { display: 'block' },
      },
      h('path', { d: 'M5 20v-7' }),
      h('path', { d: 'M10 20V5' }),
      h('path', { d: 'M15 20v-4' }),
      h('path', { d: 'M20 20V9' }),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'modeldial-leaderboard: dictionaries')
        const t = ctx.locale.bind(NS)
        translate = t
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, Page))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => t('panel'),
        }, PanelIcon))
      },
    }
  },
})
