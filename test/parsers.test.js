import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { __test } from '../index.js'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fixture = name => readFileSync(join(FIXTURES, name), 'utf8')

test('toYi folds 万 into 亿 and keeps two decimals below 10', () => {
  assert.equal(__test.toYi('1,520 万'), '≈ 0.15')
  assert.equal(__test.toYi('2.03 亿'), '≈ 2.03')
  assert.equal(__test.toYi('1052 亿'), '≈ 1052')
  assert.equal(__test.toYi('暂无'), '暂无')
})

test('parseLeaderboard reads one row per model with every axis', () => {
  const rows = __test.parseLeaderboard(fixture('leaderboard.html'))
  assert.equal(rows.length, 8)
  const top = rows[0]
  assert.equal(top.rank, '01')
  assert.equal(top.key, 'anthropic/claude-fable-5.2')
  assert.equal(top.name, 'Claude Fable 5.2')
  assert.equal(top.overall, 72.9)
  assert.equal(top.backend, 56.4)
  assert.equal(top.knowledge, 100)
  assert.equal(top.released, '2026-11-10')
  assert.equal(top.duration, '591m 33s')
  assert.equal(top.cost, '$229.19')
  // every row carries the badge span; only some lack `hidden`
  assert.equal(top.isNew, true)
  assert.ok(rows.some(row => row.isNew === false))
  assert.ok(rows.some(row => row.effortCount !== ''))
})

test('parseQuota handles table and card providers, weekly and monthly units', () => {
  const sections = __test.parseQuota(fixture('quota.html'))
  assert.deepEqual(sections.map(section => section.provider), [
    'OpenAI', 'Claude', 'Google', 'GLM', 'Kimi', 'X Subscription · Cursor', 'Ollama',
  ])
  const plans = sections.reduce((n, section) => n + section.tables.reduce((m, table) => m + table.plans.length, 0), 0)
  assert.ok(plans >= 24, `expected at least 24 plans, saw ${plans}`)

  const glm = sections.find(section => section.provider === 'GLM').tables[0]
  assert.equal(glm.plans.length, 6)
  assert.match(glm.rows[0].cells[0].quotaUnit, /周/)

  const kimi = sections.find(section => section.provider === 'Kimi').tables[0]
  assert.match(kimi.rows[0].cells[0].quotaUnit, /月/)
  // upstream leaves a whole cell empty for some provider/plan pairs
  assert.ok(kimi.rows.some(row => row.cells.some(cell => cell.quota === '')))

  // card layout: one row per plan, nested models, quota already in 亿/month
  const cursor = sections.find(section => section.provider === 'X Subscription · Cursor').tables[0]
  assert.equal(cursor.caption, '')
  assert.match(cursor.rows[0].cells[0].quotaUnit, /月/)
  assert.equal(cursor.rows[0].cells[0].api, '')
  assert.ok(cursor.rows[0].cells[0].perDollar.startsWith('每 $1'))
})

test('parseWriting ranks by score even when the snapshot is out of order', () => {
  const board = __test.parseWriting(JSON.parse(fixture('writing.json')))
  assert.equal(board.rows.length, 10)
  assert.equal(board.publishedAt, '2026-11-19T12:06:47+00:00')
  // the fixture is first 5 + last 5 of the real snapshot; 91.5 sits at the tail
  assert.deepEqual(board.rows.slice(0, 3).map(row => row.name), [
    'Gemini 4 Carbon', 'Gemini 4 Neon', 'Claude Opus 5.5',
  ])
  assert.deepEqual(board.rows.slice(0, 3).map(row => row.rank), ['01', '02', '03'])
  const top = board.rows[0]
  assert.equal(top.key, 'gemini-4-carbon')
  assert.equal(top.effort, 'high')
  assert.equal(top.understanding, 99.0909090909091)
  assert.equal(top.output, 89.0909090909091)
  // snapshot grader names are mapped to the labels the board actually shows
  assert.deepEqual(top.subaxes.map(axis => axis.label), [
    '语义辨析', '证据整合', '意图推断', '规则应用',
    '文本表达', '文体适配', '叙事推进', '成稿完整度',
  ])
  assert.deepEqual(top.subaxes.map(axis => axis.axis), [
    'understanding', 'understanding', 'understanding', 'understanding',
    'output', 'output', 'output', 'output',
  ])
  assert.equal(top.subaxes[0].key, '语义与事实')
})

test('parseWriting rejects a foreign schema loudly', () => {
  assert.throws(() => __test.parseWriting(null), /数据格式/)
  assert.throws(() => __test.parseWriting({ schema_version: 2, rows: [] }), /数据格式/)
  assert.throws(() => __test.parseWriting({ schema_version: 1, rows: [] }), /数据格式/)
  assert.throws(() => __test.parseWriting({ schema_version: 1, rows: [{ display_name: '' }] }), /没有解析到/)
})

test('parseHarness reads the server-rendered rows and splits domains out', () => {
  const board = __test.parseHarness(fixture('harness.html'))
  assert.equal(board.rows.length, 5)
  const top = board.rows[0]
  assert.equal(top.key, 'claude-code')
  assert.equal(top.name, 'Claude Code')
  assert.equal(top.rank, '01')
  assert.equal(top.overall, 57.06)
  assert.equal(top.stability, 53.2) // "53.2%" without the sign
  assert.equal(top.time, 48.4)
  assert.equal(top.cost, 42.5)
  assert.equal(top.domains.length, 8)
  assert.deepEqual(top.domains[0], { label: '软件工程', score: 59.97 })
  assert.deepEqual(top.domains[7], { label: '多媒体处理', score: 41.4 })
})

test('parsers return nothing instead of inventing rows on structure drift', () => {
  assert.deepEqual(__test.parseLeaderboard('<html></html>'), [])
  assert.deepEqual(__test.parseQuota('<html></html>'), [])
  assert.throws(() => __test.parseHarness('<html></html>'), /没有解析到/)
  assert.throws(() => __test.parseTrends('<html></html>'), /没有解析到/)
  assert.equal(__test.rowCount('writing', null), 0)
  assert.equal(__test.rowCount('writing', { rows: [1] }), 1)
  assert.equal(__test.rowCount('trends', { rows: [1, 2, 3] }), 3)
  assert.equal(__test.rowCount('leaderboard', [1, 2]), 2)
})

test('parseTrends extracts anchors, vendor spend vs usage, and adoption rows', () => {
  const trends = __test.parseTrends(fixture('trends.html'))
  assert.equal(trends.updatedAt, '2026.11.23')
  assert.equal(trends.catalogCount, 56)
  assert.equal(trends.windowDays, 90)
  assert.equal(trends.highlights.length, 3)
  assert.equal(trends.vendors.length, 7)
  assert.equal(trends.vendors[0].name, 'Anthropic')
  assert.equal(trends.vendors[0].spendShare, 40.9)
  assert.equal(trends.vendors[0].usageShare, 12.2)
  assert.equal(trends.vendors[6].usageTop, true)
  assert.equal(trends.rows.length, 26)

  const fable = trends.rows[0]
  assert.equal(fable.name, 'Claude Fable 5.2')
  assert.equal(fable.boardRank, 1)
  assert.equal(fable.score, 72.91)
  assert.equal(fable.tokenShare, 0.34)
  assert.equal(fable.spendShare, 4.68)
  assert.equal(fable.isNew28, true)
  assert.deepEqual(fable.stages, ['首3日 0.59%', '最新 0.29%'])

  const opus = trends.rows[1]
  assert.equal(opus.name, 'Claude Opus 5.5')
  assert.equal(opus.isFull28, true)
  assert.equal(opus.retentionTone, 'pos')
  assert.equal(opus.retentionChangePct, 289)
  assert.deepEqual(opus.stages, ['首3日 1.11%', '第4周 4.31%', '近7日 2.12%'])

  assert.ok(trends.rows.some(row => row.isFree === true))
  assert.ok(trends.rows.some(row => row.effort === '' && row.name === 'Gemini 4 Argon'))
})
