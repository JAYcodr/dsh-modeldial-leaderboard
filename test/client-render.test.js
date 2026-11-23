/**
 * Renders the Client half without a browser.
 *
 * `client.js` is a plain script for the host's ModuleLoader, so it is evaluated
 * in a VM with a tiny React stand-in: enough hooks to run function components
 * once, no reconciliation. That still catches the class of breakage a syntax
 * check cannot — a component that throws while building the page for a tab.
 *
 * The fixture payloads mirror the shapes the Host half serves, so the two new
 * tabs are rendered against real rows.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

import { __test } from '../index.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = join(ROOT, 'test', 'fixtures')
const fixture = name => readFileSync(join(FIXTURES, name), 'utf8')
const clientSource = readFileSync(join(ROOT, 'client.js'), 'utf8')

const feeds = (() => {
  const leaderboard = __test.parseLeaderboard(fixture('leaderboard.html'))
  const quota = __test.parseQuota(fixture('quota.html'))
  const writing = __test.parseWriting(JSON.parse(fixture('writing.json')))
  const harness = __test.parseHarness(fixture('harness.html'))
  return [
    { loading: false, busy: false, payload: { ok: true, data: leaderboard }, error: null },
    { loading: false, busy: false, payload: { ok: true, data: quota }, error: null },
    { loading: false, busy: false, payload: { ok: true, data: writing }, error: null },
    { loading: false, busy: false, payload: { ok: true, data: harness }, error: null },
  ]
})()

let feedIndex = 0
let injectedTab = 'board'

const react = {
  Fragment: 'Fragment',
  createElement(type, props, ...children) {
    const next = { ...(props || {}) }
    if (children.length === 1) next.children = children[0]
    else if (children.length > 1) next.children = children
    return { type, props: next }
  },
  useState(initial) {
    // Page's tab state is the only useState seeded with a tab id
    if (initial === 'board') return [injectedTab, () => {}]
    // useFeed's slot is the only object carrying this exact shape
    if (initial && typeof initial === 'object' && 'busy' in initial && 'payload' in initial) {
      const slot = feeds[feedIndex] || feeds[0]
      feedIndex += 1
      return [slot, () => {}]
    }
    return [typeof initial === 'function' ? initial() : initial, () => {}]
  },
  useEffect() {},
  useMemo(fn) { return fn() },
  useCallback(fn) { return fn },
  useRef(initial) { return { current: initial } },
}

/** Render a node tree, invoking function components once. */
function render(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (Array.isArray(node)) return node.map(render)
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node.type === 'function') return render(node.type(node.props || {}))
  const children = node.props ? node.props.children : null
  return { type: node.type, props: node.props || {}, children: render(children) }
}

/** Every text node in the tree, so a test can assert on what would be painted. */
function textOf(node, out = []) {
  if (node === null || node === undefined) return out
  if (Array.isArray(node)) {
    node.forEach(child => textOf(child, out))
    return out
  }
  if (typeof node === 'string') {
    out.push(node)
    return out
  }
  textOf(node.children, out)
  return out
}

function loadClient() {
  let captured = null
  const window = {
    __ModuleLoader__: {
      load(spec) { captured = spec },
    },
  }
  const context = vm.createContext({ window, console, setTimeout, clearTimeout })
  new vm.Script(clientSource, { filename: 'client.js' }).runInContext(context)
  assert.ok(captured, 'client.js must register itself with the module loader')
  assert.equal(captured.id, '@local/modeldial-leaderboard')
  const module = captured.factory(id => {
    assert.equal(id, 'react')
    return react
  })

  let Page = null
  module.apply({
    effect(fn) { return fn() },
    locale: { register() {}, bind() { return key => key } },
    slots: {
      inject(name, fn) { return fn() },
      register(spec, component) {
        if (spec.name === 'main') Page = component
        return () => {}
      },
    },
  })
  assert.ok(Page, 'the client half must register the main page')
  return Page
}

function renderTab(tab) {
  feedIndex = 0
  injectedTab = tab
  const Page = loadClient()
  const tree = render({ type: Page, props: { t: key => key } })
  return textOf(tree).join(' ')
}

test('every tab of the page renders without throwing', () => {
  const tabs = ['board', 'writing', 'harness', 'quota', 'value', 'model', 'budget']
  for (const tab of tabs) {
    assert.doesNotThrow(() => renderTab(tab), `tab ${tab} should render`)
  }
})

test('the coding board still paints its rows', () => {
  const text = renderTab('board')
  assert.match(text, /Claude Fable 5\.2/)
  assert.match(text, /tabWriting/)
  assert.match(text, /tabHarness/)
})

test('the writing board renders the fixture ranking and its axes', () => {
  const text = renderTab('writing')
  assert.match(text, /Gemini 4 Carbon/)
  assert.match(text, /Gemini 4 Neon/)
  assert.match(text, /expandAxis/)
  assert.match(text, /writingSub/)
})

test('the harness board renders completion rate as a percentage', () => {
  const text = renderTab('harness')
  assert.match(text, /Claude Code/)
  assert.match(text, /53\.2%/)
  assert.match(text, /harnessSub/)
  assert.match(text, /harnessCount/)
})

test('quota-driven tabs keep working', () => {
  assert.match(renderTab('quota'), /OpenAI/)
  assert.match(renderTab('value'), /perUnit|colPerDollar|价值|valueSub|tabValue/)
  assert.match(renderTab('model'), /tabModel/)
  assert.match(renderTab('budget'), /tabBudget/)
})
