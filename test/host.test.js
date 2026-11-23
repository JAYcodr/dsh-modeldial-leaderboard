import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { apply } from '../index.js'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fixture = name => readFileSync(join(FIXTURES, name), 'utf8')

/** Upstream bodies keyed by the exact URL the host half requests. */
const BODIES = {
  'https://modeldial.com/leaderboard/coding?axis=overall': fixture('leaderboard.html'),
  'https://modeldial.com/subscriptions?period=week&view=catalog&currency=CNY': fixture('quota.html'),
  'https://reference.modeldial.com/writing-snapshots/current.json': fixture('writing.json'),
  'https://modeldial.com/leaderboard/harness': fixture('harness.html'),
}

const realFetch = globalThis.fetch
let upstreamCalls = 0
let failing = false

function installFetch() {
  upstreamCalls = 0
  failing = false
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    const body = BODIES[url]
    if (body === undefined) return realFetch(input, init)
    upstreamCalls += 1
    if (failing) throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } })
    if (url.includes('writing-snapshots')) {
      const headers = init.headers || {}
      if (headers['if-none-match'] === '"fixture-etag"') {
        return new Response(null, { status: 304, headers: { etag: '"fixture-etag"' } })
      }
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json', etag: '"fixture-etag"' },
      })
    }
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } })
  }
}

/** Boot the host half against a fake cordis context and an ephemeral HTTP port. */
async function startPlugin() {
  const routes = new Map()
  const ctx = {
    effect: fn => fn(),
    webServer: {
      register: spec => {
        routes.set(spec.path, spec.handler)
        return () => {}
      },
    },
  }
  apply(ctx)
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    const handler = routes.get(url.pathname)
    if (!handler) {
      res.writeHead(404)
      res.end('not found')
      return
    }
    Promise.resolve(handler(req, res)).catch(error => {
      res.writeHead(500)
      res.end(String(error))
    })
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  return {
    base,
    routes,
    close: () => new Promise(resolve => server.close(resolve)),
  }
}

async function setup(t) {
  const home = await mkdtemp(join(tmpdir(), 'modeldial-home-'))
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  installFetch()
  t.after(async () => {
    globalThis.fetch = realFetch
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    await rm(home, { recursive: true, force: true })
  })
  return home
}

async function getJson(base, path) {
  const response = await fetch(base + path)
  assert.equal(response.status, 200)
  return response.json()
}

test('every route parses its payload and the in-process cache avoids refetching', async t => {
  const home = await setup(t)
  const plugin = await startPlugin()
  t.after(() => plugin.close())

  const board = await getJson(plugin.base, '/__modeldial/leaderboard')
  assert.equal(board.ok, true)
  assert.equal(board.from, 'network')
  assert.equal(board.cached, false)
  assert.equal(board.data.length, 8)
  assert.equal(upstreamCalls, 1)

  const again = await getJson(plugin.base, '/__modeldial/leaderboard')
  assert.equal(again.cached, true)
  assert.equal(upstreamCalls, 1)

  const forced = await getJson(plugin.base, '/__modeldial/leaderboard?force=1')
  assert.equal(forced.from, 'network')
  assert.equal(upstreamCalls, 2)

  const quota = await getJson(plugin.base, '/__modeldial/quota')
  assert.equal(quota.data.length, 7)
  assert.equal(quota.data[0].provider, 'OpenAI')

  const writing = await getJson(plugin.base, '/__modeldial/writing')
  assert.equal(writing.ok, true)
  assert.equal(writing.data.rows.length, 10)
  assert.equal(writing.data.rows[0].name, 'Gemini 4 Carbon')

  const harness = await getJson(plugin.base, '/__modeldial/harness')
  assert.equal(harness.ok, true)
  assert.equal(harness.data.rows.length, 5)
  assert.equal(harness.data.rows[0].name, 'Claude Code')

  // writing is the one source with an ETag: a forced refresh revalidates and
  // keeps the payload instead of erroring on the 304
  const revalidated = await getJson(plugin.base, '/__modeldial/writing?force=1')
  assert.equal(revalidated.ok, true)
  assert.equal(revalidated.cached, false)
  assert.equal(revalidated.data.rows.length, 10)

  // every successful payload is mirrored to disk
  for (const key of ['leaderboard', 'quota', 'writing', 'harness']) {
    const saved = JSON.parse(await readFile(join(home, 'cache', 'modeldial-leaderboard', `${key}.json`), 'utf8'))
    assert.equal(saved.key, key)
    assert.ok(saved.fetchedAt)
    assert.ok(saved.data)
  }
})

test('a fresh process paints from disk before touching upstream', async t => {
  const home = await setup(t)
  const first = await startPlugin()
  await getJson(first.base, '/__modeldial/leaderboard')
  await first.close()

  const before = upstreamCalls
  const second = await startPlugin()
  t.after(() => second.close())

  const payload = await getJson(second.base, '/__modeldial/leaderboard')
  assert.equal(payload.ok, true)
  assert.equal(payload.cached, true)
  assert.equal(payload.from, 'disk')
  assert.equal(payload.data.length, 8)
  assert.equal(upstreamCalls, before, 'disk cache should satisfy the request inside its TTL')
  assert.ok((await readFile(join(home, 'cache', 'modeldial-leaderboard', 'leaderboard.json'), 'utf8')).includes('Claude Fable 5.2'))
})

test('a failed refresh keeps the last payload and explains why', async t => {
  await setup(t)
  const plugin = await startPlugin()
  t.after(() => plugin.close())

  const first = await getJson(plugin.base, '/__modeldial/harness')
  assert.equal(first.ok, true)

  failing = true
  const failed = await getJson(plugin.base, '/__modeldial/harness?force=1')
  assert.equal(failed.ok, false)
  assert.match(failed.error, /网络错误/)
  // last good payload survives, so the panel can keep painting the table
  assert.equal(failed.cached, true)
  assert.equal(failed.data.rows.length, 5)

  // and a warning recovers without a restart
  failing = false
  const recovered = await getJson(plugin.base, '/__modeldial/harness?force=1')
  assert.equal(recovered.ok, true)
  assert.equal(recovered.data.rows.length, 5)
})

test('only GET and HEAD are accepted on the routes', async t => {
  await setup(t)
  const plugin = await startPlugin()
  t.after(() => plugin.close())
  const response = await fetch(plugin.base + '/__modeldial/quota', { method: 'POST' })
  assert.equal(response.status, 405)
  assert.deepEqual(await response.json(), { ok: false, error: 'method not allowed' })
})
