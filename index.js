/**
 * Host half of the Modeldial panel bundle.
 *
 * The Web page cannot fetch modeldial.com itself (cross-origin), so this
 * plugin owns the upstream fetches, parses the payloads, and serves the result
 * as JSON on same-origin routes the Client half reads:
 *
 *   GET /__modeldial/leaderboard   coding leaderboard, one row per model
 *   GET /__modeldial/quota         subscription quota matrices per provider
 *   GET /__modeldial/writing       text-capability leaderboard (official feed)
 *   GET /__modeldial/harness       harness leaderboard, one row per harness
 *   GET /__modeldial/trends        real-world usage, spend & retention (/trends)
 *
 * A short in-process cache keeps the page responsive; `?force=1` bypasses it.
 * A failed fetch is reported as `{ ok: false, error }` together with the last
 * good payload, so the panel can show "failed" instead of an empty board.
 * The last good payload of every source is also written to disk, so a fresh
 * DSH process can paint the panel before (or without) reaching upstream.
 */

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SOURCE = {
  leaderboard: {
    url: 'https://modeldial.com/leaderboard/coding?axis=overall',
    accept: 'text/html,application/xhtml+xml',
    label: '榜单',
    empty: '页面里没有解析到模型行（结构可能变了）',
  },
  quota: {
    url: 'https://modeldial.com/subscriptions?period=week&view=catalog&currency=CNY',
    accept: 'text/html,application/xhtml+xml',
    label: '额度页',
    empty: '页面里没有解析到额度表（结构可能变了）',
  },
  // The writing board is rendered on the client. The page itself reads this
  // first-party snapshot feed, so pulling the same JSON needs no browser.
  writing: {
    url: 'https://reference.modeldial.com/writing-snapshots/current.json',
    accept: 'application/json',
    label: '文本榜',
    empty: '数据里没有解析到模型行（结构可能变了）',
  },
  harness: {
    url: 'https://modeldial.com/leaderboard/harness',
    accept: 'text/html,application/xhtml+xml',
    label: 'Harness 榜',
    empty: '页面里没有解析到 Harness 行（结构可能变了）',
  },
  trends: {
    url: 'https://modeldial.com/trends',
    accept: 'text/html,application/xhtml+xml',
    label: '真实用量',
    empty: '页面里没有解析到真实用量行（结构可能变了）',
  },
}

const ROUTES = {
  '/__modeldial/leaderboard': { key: 'leaderboard', ttlMs: 4 * 60 * 1000 },
  '/__modeldial/quota': { key: 'quota', ttlMs: 10 * 60 * 1000 },
  '/__modeldial/writing': { key: 'writing', ttlMs: 15 * 60 * 1000 },
  '/__modeldial/harness': { key: 'harness', ttlMs: 10 * 60 * 1000 },
  '/__modeldial/trends': { key: 'trends', ttlMs: 15 * 60 * 1000 },
}

const FETCH_TIMEOUT_MS = 30 * 1000
const RETRY_DELAY_MS = 800

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

/** "53.2%" / "1,052" / 57.06 -> number, anything else -> null. */
function toScore(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = Number(String(value).replace(/[%,\s]/g, ''))
  return Number.isFinite(n) ? n : null
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

/**
 * The snapshot names its subaxes after the graders; the board renames and
 * regroups them for readers. Same map the site ships, so the panel and the
 * upstream table read alike.
 */
const WRITING_AXES = [
  {
    id: 'understanding',
    label: '文字理解',
    subaxes: [
      ['语义与事实', '语义辨析'],
      ['材料综合与取舍', '证据整合'],
      ['意图与语境', '意图推断'],
      ['指令与边界', '规则应用'],
    ],
  },
  {
    id: 'output',
    label: '文字输出',
    subaxes: [
      ['中文表达', '文本表达'],
      ['文体与场景适配', '文体适配'],
      ['结构与推进', '叙事推进'],
      ['内容完成度', '成稿完整度'],
    ],
  },
]

/**
 * Text-capability board. The snapshot carries no rank, and its row order is not
 * the ranking either (fresh entries are appended at the tail), so the board is
 * ordered here the same way the upstream page orders itself: overall score
 * descending, ties by model id.
 */
function parseWriting(payload) {
  if (!payload || payload.schema_version !== 1 || !Array.isArray(payload.rows) || payload.rows.length === 0) {
    throw new Error('文本榜数据格式变了（schema_version / rows 不符）')
  }
  const rows = []
  for (const row of payload.rows) {
    if (!row || typeof row !== 'object') continue
    const name = typeof row.display_name === 'string' ? row.display_name.trim() : ''
    const summary = row.summary || {}
    const overall = toScore(summary.score)
    if (!name || overall === null) continue
    const axes = summary.axes || {}
    const subscores = summary.subaxes || {}
    const subaxes = []
    for (const axis of WRITING_AXES) {
      for (const [key, label] of axis.subaxes) {
        subaxes.push({
          key,
          label,
          axis: axis.id,
          score: toScore(subscores[key] && subscores[key].score),
        })
      }
    }
    rows.push({
      key: row.model_id || row.configuration_id || name,
      name,
      effort: row.reasoning_effort || '',
      overall,
      understanding: toScore(axes.understanding && axes.understanding.score),
      output: toScore(axes.output && axes.output.score),
      subaxes,
    })
  }
  if (rows.length === 0) throw new Error('文本榜里没有解析到模型行')
  rows.sort((a, b) => b.overall - a.overall || String(a.key).localeCompare(String(b.key)))
  rows.forEach((row, index) => {
    row.rank = String(index + 1).padStart(2, '0')
  })
  return {
    publishedAt: typeof payload.published_at === 'string' ? payload.published_at : '',
    revision: typeof payload.revision === 'string' ? payload.revision : '',
    rows,
  }
}

/** Column name -> row field for the Harness board; everything else is a domain score. */
const HARNESS_FIELDS = {
  综合分: 'overall',
  稳定完成率: 'stability',
  时间效率: 'time',
  成本效率: 'cost',
}

/** Parse the server-rendered Harness board: one <tr data-harness> per harness. */
function parseHarness(html) {
  const rows = []
  const rowRe = /<tr\b[^>]*\bdata-harness="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g
  let m
  while ((m = rowRe.exec(html)) !== null) {
    const key = m[1]
    const body = m[2]
    const nameMatch = body.match(/class="harness-row-toggle"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/)
    const name = nameMatch ? strip(nameMatch[1]) : ''
    if (!name) continue
    const rankMatch = body.match(/<td\b[^>]*>\s*(\d+)\s*<\/td>/)
    const row = {
      rank: rankMatch ? rankMatch[1] : '',
      key,
      name,
      overall: null,
      stability: null,
      time: null,
      cost: null,
      domains: [],
    }
    for (const cell of body.matchAll(/<td\b[^>]*\bdata-label="([^"]+)"[^>]*>([\s\S]*?)<\/td>/g)) {
      const label = cell[1]
      const valueMatch = cell[2].match(/<span[^>]*>([\s\S]*?)<\/span>/)
      if (!valueMatch) continue
      const score = toScore(strip(valueMatch[1]))
      const field = HARNESS_FIELDS[label]
      if (field) row[field] = score
      else row.domains.push({ label, score })
    }
    if (row.overall === null) continue
    rows.push(row)
  }
  if (rows.length === 0) throw new Error('Harness 榜里没有解析到 Harness 行')
  return { rows }
}

/** Parse numeric percentage or signed delta inside a trends metric string. */
function parseTrendsPercent(text) {
  const match = String(text || '').replace(/,/g, '').match(/([+-]?\d+(?:\.\d+)?)\s*%/)
  return match ? Number(match[1]) : null
}

/** Parse the /trends SSR page: summary anchors, vendor spend/usage bars, and adoption rows. */
function parseTrends(html) {
  const updatedMatch = html.match(/更新至\s*([0-9.]+)/)
  const catalogMatch = html.match(/(\d+)\s*款公开模型/)
  const windowMatch = html.match(/(\d+)\s*日窗口/)
  const medianMatch = html.match(/综合分\s*([\d.]+)\s*\/\s*占比\s*([\d.]+)%/)

  const highlights = []
  for (const item of html.matchAll(/class="[^"]*__anchorItem"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g)) {
    const block = item[1]
    const label = strip((block.match(/class="[^"]*__anchorLabel"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])
    const value = strip((block.match(/class="[^"]*__anchorNum"[^>]*>([\s\S]*?)<\/strong>/) || ['', ''])[1])
    const text = strip((block.match(/class="[^"]*__anchorText"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])
    if (label && value) highlights.push({ label, value, text })
  }

  const vendors = []
  const vendorSvgMatch = html.match(/<svg[^>]*aria-label="各厂商 API 账单占比排行[^"]*"[^>]*>([\s\S]*?)<\/svg>/)
  if (vendorSvgMatch) {
    for (const g of vendorSvgMatch[1].matchAll(/<g\b[^>]*data-rank-lab="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)) {
      const texts = [...g[2].matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(t => strip(t[1])).filter(Boolean)
      if (texts.length < 2) continue
      const spendShare = parseTrendsPercent(texts[1])
      const usageText = texts[2] || ''
      const usageShare = parseTrendsPercent(usageText)
      vendors.push({
        id: g[1],
        name: texts[0],
        spendShare,
        usageShare,
        usageTop: /第\s*1/.test(usageText),
      })
    }
  }

  const rows = []
  const rowRe = /<tr\b[^>]*\bid="adoption-row-([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g
  let m
  while ((m = rowRe.exec(html)) !== null) {
    const rawId = m[1]
    const body = m[2]
    let key = rawId
    try { key = decodeURIComponent(rawId) } catch { key = rawId }
    const linkMatch = body.match(/class="[^"]*__modelLink"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/)
      || body.match(/class="[^"]*__modelLink"[^>]*>([\s\S]*?)<\/a>/)
    const name = linkMatch ? strip(linkMatch[linkMatch.length - 1]) : ''
    if (!name) continue
    const rawHref = linkMatch && linkMatch.length === 3 ? linkMatch[1].replace(/&amp;/g, '&') : ''
    const href = rawHref ? (rawHref.startsWith('http') ? rawHref : 'https://modeldial.com' + rawHref) : ''

    const rankText = strip((body.match(/class="[^"]*__rankChip"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])
    const rankMatch = rankText.match(/(\d+)/)
    const boardRank = rankMatch ? Number(rankMatch[1]) : null

    const subText = strip((body.match(/class="[^"]*__modelSub"[^>]*>([\s\S]*?)<\/div>/) || ['', ''])[1])
    const parts = subText.split('·').map(p => p.trim()).filter(Boolean)
    const vendor = parts[0] || ''
    let effort = ''
    let evalCost = ''
    for (const part of parts.slice(1)) {
      if (/^\$/.test(part)) evalCost = part
      else if (/档$/.test(part)) effort = part.replace(/\s*档$/, '').trim()
    }

    const scoreBlock = (body.match(/class="[^"]*__colScore"[^>]*>([\s\S]*?)<\/div>/) || ['', ''])[1]
    const score = toScore(strip((scoreBlock.match(/<strong[^>]*>([\s\S]*?)<\/strong>/) || ['', ''])[1]))

    const shareBlock = (body.match(/class="[^"]*__colShare"[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="[^"]*__colSpend")/) || ['', ''])[1]
    const tokenShare = parseTrendsPercent(strip((shareBlock.match(/<strong[^>]*>([\s\S]*?)<\/strong>/) || ['', ''])[1]))
    const shareNote = strip((shareBlock.match(/class="[^"]*__subMetric[^"]*"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])
    const deltaMatch = shareNote.match(/([+-]?\d+(?:\.\d+)?)\s*百分点/)
    const shareDelta = deltaMatch ? Number(deltaMatch[1]) : null

    const spendBlock = (body.match(/class="[^"]*__colSpend"[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="[^"]*__colRetention")/) || ['', ''])[1]
    const spendShare = parseTrendsPercent(strip((spendBlock.match(/<strong[^>]*>([\s\S]*?)<\/strong>/) || ['', ''])[1]))
    const spendNote = strip((spendBlock.match(/class="[^"]*__subMetric[^"]*"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])

    const retBlock = (body.match(/class="[^"]*__colRetention"[^>]*>([\s\S]*?)<\/div>(?=\s*<div class="[^"]*__colActions")/) || ['', ''])[1]
    const pillMatch = retBlock.match(/class="[^"]*__pillTag\s+([^"]*)"[^>]*>([\s\S]*?)<\/span>/)
    const pillClass = pillMatch ? pillMatch[1] : ''
    let retentionTag = pillMatch ? strip(pillMatch[2]) : ''
    if (!retentionTag) {
      retentionTag = strip((retBlock.match(/class="[^"]*__mutedDash"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])
    }
    let retentionTone = 'muted'
    if (/tagPos/.test(pillClass)) retentionTone = 'pos'
    else if (/tagAccent/.test(pillClass)) retentionTone = 'accent'
    else if (/tagWarn/.test(pillClass)) retentionTone = 'warn'
    else if (/tagNeg/.test(pillClass)) retentionTone = 'neg'
    else if (/tagNeutral/.test(pillClass)) retentionTone = 'neutral'

    const retentionChange = strip((retBlock.match(/class="[^"]*__retChange"[^>]*>([\s\S]*?)<\/strong>/) || ['', ''])[1])
    const changePctMatch = retentionChange.match(/([+-]?\d+(?:\.\d+)?)\s*%/)
    const retentionChangePct = changePctMatch ? Number(changePctMatch[1]) : null
    const lowBase = strip((retBlock.match(/class="[^"]*__lowBaseTag"[^>]*>([\s\S]*?)<\/span>/) || ['', ''])[1])

    const stagesHtml = (retBlock.match(/class="[^"]*__retStages"[^>]*>([\s\S]*?)<\/div>/) || ['', ''])[1]
    const stages = []
    if (stagesHtml) {
      for (const s of stagesHtml.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g)) {
        if (/__stageArrow/.test(s[0])) continue
        const text = strip(s[1])
        if (text && text !== '→') stages.push(text)
      }
    }

    const isFree = /__freeChip/.test(body)
    const isNew28 = /观察期/.test(lowBase) || /^上线\s*\d+\s*天/.test(retentionTag)
    const isFull28 = Boolean(retentionChange)

    rows.push({
      rank: String(rows.length + 1).padStart(2, '0'),
      key,
      name,
      href,
      boardRank,
      vendor,
      effort,
      evalCost,
      isFree,
      score,
      tokenShare,
      shareNote,
      shareDelta,
      spendShare,
      spendNote,
      retentionTag: retentionTag === '—' ? '' : retentionTag,
      retentionTone,
      retentionChange,
      retentionChangePct,
      lowBase,
      stages,
      isNew28,
      isFull28,
    })
  }
  if (rows.length === 0) throw new Error('真实用量页里没有解析到模型行')

  return {
    updatedAt: updatedMatch ? updatedMatch[1] : '',
    catalogCount: catalogMatch ? Number(catalogMatch[1]) : rows.length,
    windowDays: windowMatch ? Number(windowMatch[1]) : 90,
    medians: medianMatch ? { score: Number(medianMatch[1]), share: Number(medianMatch[2]) } : null,
    highlights,
    vendors,
    rows,
  }
}

const PARSERS = {
  leaderboard: parseLeaderboard,
  quota: parseQuota,
  writing: text => {
    let payload
    try {
      payload = JSON.parse(text)
    } catch {
      throw new Error('文本榜返回的不是 JSON（结构可能变了）')
    }
    return parseWriting(payload)
  },
  harness: parseHarness,
  trends: parseTrends,
}

/** How many rows a payload carries; used to reject empty parses and validate disk cache. */
function rowCount(key, data) {
  if (!data) return 0
  if (key === 'writing' || key === 'harness' || key === 'trends') return Array.isArray(data.rows) ? data.rows.length : 0
  return Array.isArray(data) ? data.length : 0
}

/** Exposed so the parsers can be exercised against saved HTML without restarting DSH. */
export const __test = { parseLeaderboard, parseQuota, parseWriting, parseHarness, parseTrends, toYi, toScore, rowCount }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** One retry for transport failures and gateway hiccups; never for parse errors. */
async function fetchWithRetry(url, headers, signal) {
  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { headers, signal })
      if (attempt === 0 && (response.status === 502 || response.status === 503 || response.status === 504)) {
        lastError = new Error(`HTTP ${response.status}`)
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return response
    } catch (error) {
      if (error && error.name === 'AbortError') throw error
      lastError = error
      if (attempt === 0) await sleep(RETRY_DELAY_MS)
    }
  }
  throw lastError
}

/** Fetch one upstream page and turn it into the payload the panel renders. */
async function fetchPayload(key, etag) {
  const spec = SOURCE[key]
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const headers = {
      accept: spec.accept,
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'user-agent': 'deepseek-harness/modeldial-leaderboard',
    }
    // The writing feed is the only source serving an ETag; others simply see no header.
    if (etag) headers['if-none-match'] = etag
    const response = await fetchWithRetry(spec.url, headers, controller.signal)
    if (response.status === 304) return { notModified: true }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = PARSERS[key](await response.text())
    if (rowCount(key, data) === 0) throw new Error(spec.empty)
    return { data, etag: response.headers.get('etag') || '' }
  } finally {
    clearTimeout(timer)
  }
}

/** Human-readable failure line; the panel prints it verbatim inside the banner. */
function describeError(error) {
  if (!error) return '未知错误'
  if (error.name === 'AbortError') return '抓取超时'
  const cause = error.cause
  if (error instanceof TypeError) {
    const detail = (cause && (cause.code || cause.message)) || ''
    return '网络错误' + (detail ? `（${String(detail)}）` : '')
  }
  return String(error.message || error)
}

/** Where the last good payload of every source is parked between processes. */
function cacheDir() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'cache', 'modeldial-leaderboard')
}

async function readCache(key) {
  try {
    const parsed = JSON.parse(await readFile(join(cacheDir(), `${key}.json`), 'utf8'))
    if (!parsed || rowCount(key, parsed.data) === 0) return null
    return parsed
  } catch {
    return null
  }
}

/** Atomic write: a reader never sees a half-written payload, a dead process leaves only *.tmp. */
async function writeCache(key, slot) {
  try {
    const dir = cacheDir()
    await mkdir(dir, { recursive: true })
    const target = join(dir, `${key}.json`)
    const tmp = `${target}.${process.pid}.tmp`
    const body = JSON.stringify({
      key,
      fetchedAt: new Date(slot.at).toISOString(),
      savedAt: Date.now(),
      etag: slot.etag || '',
      data: slot.data,
    })
    await writeFile(tmp, body, 'utf8')
    await rename(tmp, target)
  } catch {
    // Cache is a nicety; a read-only home must not break the panel.
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
    leaderboard: { at: 0, data: null, pending: null, etag: '', from: null, loaded: false },
    quota: { at: 0, data: null, pending: null, etag: '', from: null, loaded: false },
    writing: { at: 0, data: null, pending: null, etag: '', from: null, loaded: false },
    harness: { at: 0, data: null, pending: null, etag: '', from: null, loaded: false },
    trends: { at: 0, data: null, pending: null, etag: '', from: null, loaded: false },
  }

  /** Payload shape never changes; `from` only says where the bytes came from. */
  function payloadOf(slot, ok, cached, error) {
    return {
      ok,
      cached,
      from: slot.from,
      fetchedAt: slot.at ? new Date(slot.at).toISOString() : null,
      error,
      data: slot.data,
    }
  }

  async function read(key, force, ttlMs) {
    const slot = state[key]
    if (!slot.loaded) {
      slot.loaded = true
      const cached = await readCache(key)
      if (cached && slot.data === null) {
        slot.data = cached.data
        slot.at = Date.parse(cached.fetchedAt) || cached.savedAt || 0
        slot.etag = cached.etag || ''
        slot.from = 'disk'
      }
    }
    if (!force && slot.data && Date.now() - slot.at < ttlMs) {
      return payloadOf(slot, true, true, null)
    }
    if (!slot.pending) {
      slot.pending = fetchPayload(key, slot.data ? slot.etag : '')
        .then(async result => {
          if (result.notModified && slot.data) {
            slot.at = Date.now()
            slot.from = 'network'
            return slot.data
          }
          slot.data = result.data
          slot.etag = result.etag || ''
          slot.at = Date.now()
          slot.from = 'network'
          await writeCache(key, slot)
          return slot.data
        })
        .finally(() => {
          slot.pending = null
        })
    }
    try {
      const data = await slot.pending
      return payloadOf(slot, true, false, null) // data === slot.data
    } catch (error) {
      return payloadOf(slot, false, Boolean(slot.data), describeError(error))
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
