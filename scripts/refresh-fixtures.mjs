#!/usr/bin/env node
/**
 * Refresh the truncated fixtures under test/fixtures from the live sources.
 *
 * The tests never touch the network, so the samples are committed. Upstream
 * changes its markup sooner or later; when a parser starts failing, run this
 * and diff the fixtures to see what actually changed.
 *
 *   node scripts/refresh-fixtures.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'test', 'fixtures')

const SOURCES = {
  leaderboard: 'https://modeldial.com/leaderboard/coding?axis=overall',
  quota: 'https://modeldial.com/subscriptions?period=week&view=catalog&currency=CNY',
  writing: 'https://reference.modeldial.com/writing-snapshots/current.json',
  harness: 'https://modeldial.com/leaderboard/harness',
}

const QUOTA_PROVIDERS = [
  'OpenAI',        // <table>, weekly units
  'Claude',        // <table>, weekly units
  'Google',        // <table>, weekly units
  'GLM',           // <table>, weekly units, six plans
  'Kimi',          // <table>, monthly units, a cell without an API value
  'X Subscription · Cursor', // card layout, no <table>
  'Ollama',        // <table>, monthly units
]

const HEADERS = {
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'user-agent': 'deepseek-harness/modeldial-leaderboard fixtures',
}

async function get(url, accept = HEADERS.accept) {
  const response = await fetch(url, { headers: { ...HEADERS, accept } })
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`)
  return response.text()
}

/** Keep the first `count` elements matched by `re` and rejoin them. */
function takeBlocks(html, re, count) {
  const blocks = [...html.matchAll(re)].slice(0, count).map(match => match[0])
  return blocks.join('\n')
}

/** Slice out whole provider sections (an <h2> up to the next <h2>). */
function takeProviders(html, names) {
  const heads = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(match => ({
    name: match[1].replace(/<[^>]*>/g, '').trim(),
    start: match.index,
  }))
  const parts = []
  for (const name of names) {
    const index = heads.findIndex(head => head.name === name)
    if (index === -1) throw new Error(`provider not found upstream: ${name}`)
    const start = heads[index].start
    const end = index + 1 < heads.length ? heads[index + 1].start : html.length
    parts.push(html.slice(start, end))
  }
  return parts.join('\n')
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const leaderboard = await get(SOURCES.leaderboard)
  const leaderboardRows = takeBlocks(leaderboard, /<tr\b[^>]*\bdata-model="[^"]+"[^>]*>[\s\S]*?<\/tr>/g, 8)
  await writeFile(join(OUT, 'leaderboard.html'), leaderboardRows + '\n', 'utf8')

  const quota = await get(SOURCES.quota)
  const quotaSections = takeProviders(quota, QUOTA_PROVIDERS)
  await writeFile(join(OUT, 'quota.html'), quotaSections + '\n', 'utf8')

  const writing = JSON.parse(await get(SOURCES.writing, 'application/json'))
  const rows = writing.rows
  // first 5 + last 5: the tail carries higher-scored entries that are appended
  // out of rank order, which is exactly what parseWriting has to fix.
  const sampleRows = rows.length > 10 ? [...rows.slice(0, 5), ...rows.slice(-5)] : rows
  await writeFile(join(OUT, 'writing.json'), JSON.stringify({
    schema_version: writing.schema_version,
    board_id: writing.board_id,
    published_at: writing.published_at,
    revision: writing.revision,
    rows: sampleRows,
  }, null, 1) + '\n', 'utf8')

  const harness = await get(SOURCES.harness)
  const harnessRows = takeBlocks(harness, /<tr\b[^>]*\bdata-harness="[^"]+"[^>]*>[\s\S]*?<\/tr>/g, 5)
  await writeFile(join(OUT, 'harness.html'), harnessRows + '\n', 'utf8')

  console.log('fixtures written to', OUT)
  console.log('leaderboard rows:', (leaderboardRows.match(/data-model=/g) || []).length)
  console.log('quota providers:', QUOTA_PROVIDERS.length)
  console.log('writing rows:', sampleRows.length)
  console.log('harness rows:', (harnessRows.match(/data-harness=/g) || []).length)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
