/**
 * Host half of the Modeldial panel bundle.
 *
 * The Web page cannot fetch modeldial.com itself (cross-origin), so this
 * plugin owns the two upstream fetches, parses the server-rendered tables,
 * and serves the result as JSON on same-origin routes the Client half reads:
 *
 *   GET /__modeldial/leaderboard   coding leaderboard, one row per model
 *   GET /__modeldial/quota         subscription quota matrices per provider
 *
 * A short in-process cache keeps the page responsive; `?force=1` bypasses it.
 * A failed fetch is reported as `{ ok: false, error }` together with the last
 * good payload, so the panel can show "failed" instead of an empty board.
 */

const SOURCE = {
  leaderboard: 'https://modeldial.com/leaderboard/coding?axis=overall',
  quota: 'https://modeldial.com/subscriptions?period=week&view=catalog&currency=CNY&provider=Google',
}

const ROUTES = {
  '/__modeldial/leaderboard': { key: 'leaderboard', ttlMs: 4 * 60 * 1000 },
  '/__modeldial/quota': { key: 'quota', ttlMs: 10 * 60 * 1000 },
}

const FETCH_TIMEOUT_MS = 30 * 1000

/** @param {string} s @returns {string} */
function strip(s) {
  return s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Parse the coding leaderboard table: one row per model. */
function parseLeaderboard(html) {
  const rows = []
  const rowRe = /<tr\b[^>]*\bdata-model="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g
  let m
  while ((m = rowRe.exec(html)) !== null) {
    const key = m[1]
    const body = m[2]
    const tds = [...body.matchAll(/<td\b[^>]*>[\s\S]*?<\/td>/g)].map(x => x[0])
    const nameMatch = body.match(/<a[^>]*class="model-result-link"[^>]*>([\s\S]*?)<\/a>/)
    const effortMatch = body.match(/<span class="effort-label">([\s\S]*?)<\/span>/)
    // "max · 5 个档位": only 26 of 54 models advertise more than one effort level,
    // so this stays optional rather than getting a placeholder on every row.
    const effortCountMatch = body.match(/class="effort-count"[^>]*>([\s\S]*?)<\/span>/)
    const dateMatch = body.match(/<time[^>]*datetime="([^"]+)"/)
    const scores = []
    for (const td of tds) {
      if (!/class="[^"]*\bscore\b/.test(td)) continue
      const value = td.match(/<span>\s*([\d.]+)\s*<\/span>/)
      if (value) scores.push(Number(value[1]))
    }
    const durationMatch = body.match(/<td[^>]*class="duration-cell"[^>]*>([\s\S]*?)<\/td>/)
    const costMatch = body.match(/<td[^>]*class="cost-cell"[^>]*>([\s\S]*?)<\/td>/)
    const name = nameMatch ? strip(nameMatch[1]) : strip(tds[1] || '')
    if (!name) continue
    rows.push({
      rank: strip(tds[0] || ''),
      key,
      name,
      effort: effortMatch ? strip(effortMatch[1]) : '',
      effortCount: effortCountMatch ? (strip(effortCountMatch[1]).match(/(\d+)/) || [])[1] || '' : '',
      released: dateMatch ? dateMatch[1] : '',
      // 上游 54 行每行都带这个 span，只有 8 行没有 hidden；只测 class 名会让全表都挂「新」
      isNew: /<span class="model-new-badge"(?![^>]*\bhidden\b)/.test(body),
      overall: scores[0] ?? null,
      backend: scores[1] ?? null,
      aesthetic: scores[2] ?? null,
      knowledge: scores[3] ?? null,
      frontend: scores[4] ?? null,
      maintainability: scores[5] ?? null,
      duration: durationMatch ? strip(durationMatch[1]) : '',
      cost: costMatch ? strip(costMatch[1]) : '',
    })
  }
  return rows
}

/**
 * "1,520 万" -> "≈ 0.15", "2.03 亿" -> "≈ 2.03". Keeps the quota column in 亿
 * so providers of both shapes read the same.
 */
function toYi(text) {
  const match = String(text).replace(/,/g, '').match(/([\d.]+)\s*(亿|万)?/)
  if (!match) return text
  const value = Number(match[1])
  if (!Number.isFinite(value)) return text
  const yi = match[2] === '万' ? value / 10000 : value
  const shown = yi >= 10 ? yi.toFixed(yi >= 100 ? 0 : 1) : yi.toFixed(2)
  return '≈ ' + shown.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
}

/**
 * Parse a provider section that has no <table>: the site renders these as one
 * row per plan ("档位" + price) with that plan's models nested inside. Turn it
 * back into the same matrix shape the other providers use (models x plans).
 */
function parseMultiModel(body) {
  const rowRe = /<div class="([^"]*__overviewRow[^"]*)">([\s\S]*?)(?=<div class="[^"]*__overviewRow|<\/section>|$)/g
  const plans = []
  const perPlan = []
  const order = []
  let m
  while ((m = rowRe.exec(body)) !== null) {
    if (/__columns/.test(m[1])) continue
    const block = m[2]
    const tier = block.match(/<strong>([\s\S]*?)<\/strong>/)
    if (!tier) continue
    const price = block.match(/__price"[^>]*>([\s\S]*?)<\/span>/)
    plans.push({ name: strip(tier[1]), price: price ? strip(price[1]) : '' })
    const cells = new Map()
    const cellRe = /__modelLink"[^>]*>([\s\S]*?)<\/a>[\s\S]*?__amount"[^>]*>([\s\S]*?)<\/span>[\s\S]*?__value"[^>]*>([\s\S]*?)<\/span>/g
    let c
    while ((c = cellRe.exec(block)) !== null) {
      const model = strip(c[1])
      // the matrix tables quote quota in 亿, but these rows mix 万 and 亿; normalise to 亿
      cells.set(model, { quota: toYi(strip(c[2])), quotaUnit: '亿 Token/月', api: '', perDollar: '每 $1 ' + strip(c[3]) })
      if (!order.includes(model)) order.push(model)
    }
    perPlan.push(cells)
  }
  if (plans.length === 0 || order.length === 0) return null
  const rows = order.map(model => ({
    model,
    cells: perPlan.map(cells => cells.get(model) || { quota: '', api: '', perDollar: '' }),
  }))
  return { caption: '', plans, rows }
}

/** Parse the subscription page: one matrix (models x plans) per provider. */
function parseQuota(html) {
  const out = []
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(m => ({ name: strip(m[1]), at: m.index ?? 0 }))
  for (let i = 0; i < h2s.length; i++) {
    const provider = h2s[i].name
    const body = html.slice(h2s[i].at, i + 1 < h2s.length ? h2s[i + 1].at : html.length)
    const tables = [...body.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/g)]
    const parsed = []
    for (const t of tables) {
      const inner = t[1]
      const plans = [...inner.matchAll(/class="[^"]*__planTitle"[^>]*>\s*<span>([\s\S]*?)<\/span>/g)].map(m => strip(m[1]))
      if (plans.length === 0) continue
      const prices = [...inner.matchAll(/class="[^"]*__planPrice"[^>]*>([\s\S]*?)<\/div>/g)].map(m => strip(m[1]))
      const caption = strip((inner.match(/<caption>([\s\S]*?)<\/caption>/) || ['', ''])[1])
      const tbody = (inner.match(/<tbody>([\s\S]*?)<\/tbody>/) || ['', ''])[1]
      const rows = []
      for (const r of tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
        const rowBody = r[1]
        const modelMatch = rowBody.match(/<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>/)
        if (!modelMatch) continue
        const cells = []
        for (const td of rowBody.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)) {
          const cell = td[1]
          const quota = (cell.match(/__quotaNumber"[^>]*>([\s\S]*?)<\/span>/) || [])[1]
          // "亿 Token/周" or "亿 Token/月" — the site mixes both across providers, and the
          // difference is 52/12. Keep it so the panel can normalise instead of guessing.
          const quotaUnit = (cell.match(/__quotaUnit"[^>]*>([\s\S]*?)<\/span>/) || [])[1]
          const api = (cell.match(/__apiValue"[^>]*>([\s\S]*?)<\/span>/) || [])[1]
          const perDollar = (cell.match(/__value"[^>]*>([\s\S]*?)<\/span>/) || [])[1]
          cells.push({
            quota: quota ? strip(quota) : '',
            quotaUnit: quotaUnit ? strip(quotaUnit) : '',
            api: api ? strip(api) : '',
            perDollar: perDollar ? strip(perDollar) : '',
          })
        }
        if (cells.length) rows.push({ model: strip(modelMatch[1]), cells })
      }
      if (rows.length) parsed.push({ caption, plans: plans.map((name, k) => ({ name, price: prices[k] || '' })), rows })
    }
    if (parsed.length === 0) {
      const multi = parseMultiModel(body)
      if (multi) parsed.push(multi)
    }
    if (parsed.length) out.push({ provider, tables: parsed })
  }
  return out
}

const PARSERS = { leaderboard: parseLeaderboard, quota: parseQuota }

/** Exposed so the parsers can be exercised against saved HTML without restarting DSH. */
export const __test = { parseLeaderboard, parseQuota, toYi }

/** Fetch one upstream page and turn it into the payload the panel renders. */
async function fetchPayload(key) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(SOURCE[key], {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'user-agent': 'deepseek-harness/modeldial-leaderboard',
      },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = PARSERS[key](await response.text())
    if (data.length === 0) throw new Error(key === 'leaderboard' ? '页面里没有解析到模型行（结构可能变了）' : '页面里没有解析到额度表（结构可能变了）')
    return data
  } finally {
    clearTimeout(timer)
  }
}

/** Serve a JSON body with no caching on the browser side. */
function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

export const inject = ['webServer']

export function apply(ctx) {
  /** Last successful payload per source, plus the in-flight fetch. */
  const state = {
    leaderboard: { at: 0, data: null, pending: null },
    quota: { at: 0, data: null, pending: null },
  }

  async function read(key, force, ttlMs) {
    const slot = state[key]
    if (!force && slot.data && Date.now() - slot.at < ttlMs) {
      return { ok: true, cached: true, fetchedAt: new Date(slot.at).toISOString(), error: null, data: slot.data }
    }
    if (!slot.pending) {
      slot.pending = fetchPayload(key)
        .then(data => {
          slot.data = data
          slot.at = Date.now()
          return data
        })
        .finally(() => {
          slot.pending = null
        })
    }
    try {
      const data = await slot.pending
      return { ok: true, cached: false, fetchedAt: new Date(slot.at).toISOString(), error: null, data }
    } catch (error) {
      const message = error && error.name === 'AbortError' ? '抓取超时' : String((error && error.message) || error)
      return {
        ok: false,
        cached: Boolean(slot.data),
        fetchedAt: slot.at ? new Date(slot.at).toISOString() : null,
        error: message,
        data: slot.data,
      }
    }
  }

  for (const [path, spec] of Object.entries(ROUTES)) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact',
      path,
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          send(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        const url = new URL(req.url || path, 'http://localhost')
        const result = await read(spec.key, url.searchParams.get('force') === '1', spec.ttlMs)
        send(res, 200, result)
      },
    }), `modeldial-leaderboard: route ${path}`)
  }
}
