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
let injectedOpen = null

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
    if (initial === null && injectedOpen) return [injectedOpen, () => {}]
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

function renderTabTree(tab, openKey = null) {
  feedIndex = 0
  injectedTab = tab
  injectedOpen = openKey
  const Page = loadClient()
  return render({ type: Page, props: { t: key => key } })
}

function renderTab(tab, openKey = null) {
  return textOf(renderTabTree(tab, openKey)).join(' ')
}

function findAll(node, predicate, out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach(child => findAll(child, predicate, out))
    return out
  }
  if (predicate(node)) out.push(node)
  findAll(node.children, predicate, out)
  return out
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

test('halftone canvas, refresh busy state, and readable CSS rules are wired', () => {
  const tree = renderTabTree('board')
  const canvases = findAll(tree, n => n.type === 'canvas' && n.props?.className === 'mdlb-paper-canvas')
  assert.equal(canvases.length, 1, 'halftone paper should contain a canvas element')

  const refreshButtons = findAll(tree, n => n.type === 'button' && n.props?.className === 'mdlb-btn')
  assert.equal(refreshButtons.length, 1)
  assert.equal(refreshButtons[0].props['data-busy'], 'false')
  assert.equal(refreshButtons[0].props['aria-busy'], 'false')

  const styles = findAll(tree, n => n.type === 'style')
  const cssText = textOf(styles).join('')
  assert.match(cssText, /font-size:\s*14px/)
  assert.match(cssText, /@keyframes mdlb-spin/)
  assert.match(cssText, /@starting-style/)
  assert.match(cssText, /\.mdlb-detail-clip/)
  assert.match(cssText, /prefers-reduced-motion:\s*reduce/)
})

test('expanded writing row wraps axes inside the smooth detail clip drawer', () => {
  const tree = renderTabTree('writing', 'muse-wonder')
  const clips = findAll(tree, n => n.props?.className === 'mdlb-detail-clip')
  assert.equal(clips.length, 1)
  const axesBars = findAll(clips[0], n => n.type === 'i' && n.props?.style && '--axis-i' in n.props.style)
  assert.equal(axesBars.length, 8)
})
