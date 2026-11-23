#!/usr/bin/env node
/**
 * Render the Client half to static HTML for visual QA — no DSH, no browser
 * extensions, no network.
 *
 * `client.js` is a plain script for the host's ModuleLoader, so it is evaluated
 * in a VM with a tiny React stand-in (same trick as test/client-render.test.js)
 * and the resulting element tree is serialised. Payloads come from
 * test/fixtures, so what you see is the real page code against real rows.
 *
 * The host theme tokens (`--dsw-alias-*`) are approximated here; spacing, type,
 * alignment and everything drawn by this plugin's own CSS are the real thing.
 *
 *   node scripts/preview.mjs --tab=writing
 *   node scripts/preview.mjs --tab=harness --width=1600 --dark
 *   node scripts/preview.mjs --all
 *
 * Then open the printed files (or screenshot them) and look.
 */

import fs from 'node:fs'
import vm from 'node:vm'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { __test } from '../index.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const args = new Map()
for (const raw of process.argv.slice(2)) {
  const [key, value = 'true'] = raw.replace(/^--/, '').split('=')
  args.set(key, value)
}

const width = Number(args.get('width') || 1280)
const height = Number(args.get('height') || 900)
const dark = args.get('dark') === 'true'
const outDir = args.get('out') || '/tmp/modeldial-preview'
const openKey = args.get('open') || ''
const tabList = args.get('all') === 'true'
  ? ['board', 'writing', 'harness', 'quota', 'value', 'model', 'budget']
  : [args.get('tab') || 'board']

const fixture = name => fs.readFileSync(join(ROOT, 'test', 'fixtures', name), 'utf8')

const feeds = [
  { loading: false, busy: false, payload: { ok: true, data: __test.parseLeaderboard(fixture('leaderboard.html')) }, error: null },
  { loading: false, busy: false, payload: { ok: true, data: __test.parseQuota(fixture('quota.html')) }, error: null },
  { loading: false, busy: false, payload: { ok: true, data: __test.parseWriting(JSON.parse(fixture('writing.json'))) }, error: null },
  { loading: false, busy: false, payload: { ok: true, data: __test.parseHarness(fixture('harness.html')) }, error: null },
]

let feedIndex = 0
let injectedTab = 'board'
let dicts = null

const react = {
  Fragment: 'Fragment',
  createElement(type, props, ...children) {
    const next = { ...(props || {}) }
    if (children.length === 1) next.children = children[0]
    else if (children.length > 1) next.children = children
    return { type, props: next }
  },
  useState(initial) {
    if (initial === 'board') return [injectedTab, () => {}]
    if (initial === null && openKey) return [openKey, () => {}]
    if (initial && typeof initial === 'object' && 'busy' in initial && 'payload' in initial) {
      const slot = feeds[feedIndex] || feeds[0]
      feedIndex += 1
      return [slot, () => {}]
    }
    return [typeof initial === 'function' ? initial() : initial, () => {}]
  },
  useEffect() {},
  useMemo: fn => fn(),
  useCallback: fn => fn,
  useRef: initial => ({ current: initial }),
}

function render(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (Array.isArray(node)) return node.map(render)
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (typeof node.type === 'function') return render(node.type(node.props || {}))
  return {
    type: node.type,
    props: node.props || {},
    children: render(node.props ? node.props.children : null),
  }
}

const KEEP = new Set(['viewBox', 'preserveAspectRatio'])
const ATTR = { colSpan: 'colspan', rowSpan: 'rowspan', tabIndex: 'tabindex' }
const kebab = key => ATTR[key] || (KEEP.has(key) ? key : key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()))
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const styleOf = style => Object.entries(style).map(([key, value]) => `${kebab(key)}:${value}`).join(';')

function serialize(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (Array.isArray(node)) return node.map(serialize).join('')
  if (typeof node === 'string') return escape(node)
  const { type, props, children } = node
  if (type === 'Fragment') return serialize(children)
  const attrs = []
  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'children' || value === null || value === undefined || value === false || typeof value === 'function') continue
    if (key === 'style') {
      attrs.push(`style="${escape(styleOf(value))}"`)
      continue
    }
    if (key === 'className') {
      attrs.push(`class="${escape(value)}"`)
      continue
    }
    if (typeof value === 'object') continue
    attrs.push(value === true ? kebab(key) : `${kebab(key)}="${escape(value)}"`)
  }
  if (['input', 'img', 'br', 'hr', 'meta', 'link'].includes(type)) return `<${type} ${attrs.join(' ')}>`
  const inner = type === 'style'
    ? (Array.isArray(children) ? children.join('') : children || '')
    : serialize(children)
  return `<${type} ${attrs.join(' ')}>${inner}</${type}>`
}

function loadPage() {
  let captured = null
  const window = { __ModuleLoader__: { load(spec) { captured = spec } } }
  new vm.Script(fs.readFileSync(join(ROOT, 'client.js'), 'utf8'), { filename: 'client.js' })
    .runInNewContext({ window, console })
  const module = captured.factory(() => react)
  let Page = null
  module.apply({
    effect(fn) { return fn() },
    locale: { register(namespace, dictionaries) { dicts = dictionaries }, bind() { return key => key } },
    slots: {
      inject(name, fn) { return fn() },
      register(spec, component) {
        if (spec.name === 'main') Page = component
        return () => {}
      },
    },
  })
  return Page
}

const translate = (key, vars) => {
  let text = dicts && dicts.zh[key] !== undefined ? dicts.zh[key] : key
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll('{' + name + '}', String(value))
  return text
}

const PAGE = loadPage()

/** Host theme tokens are the only thing faked here. */
const TOKENS = dark
  ? `--dsw-alias-label-primary:#e9e9ec;--dsw-alias-label-secondary:#a4a5ab;--dsw-alias-label-tertiary:#6f7077;--dsw-alias-bg-base:#17181c;--dsw-alias-state-error-primary:#ff6b6b`
  : `--dsw-alias-label-primary:#1d1d1f;--dsw-alias-label-secondary:#55555c;--dsw-alias-label-tertiary:#8e8e93;--dsw-alias-bg-base:#ffffff;--dsw-alias-state-error-primary:#c0392b`

function pageFor(tab) {
  feedIndex = 0
  injectedTab = tab
  const tree = render({ type: PAGE, props: { t: translate } })
  const body = serialize(tree)
  const wrapper = dark ? `<div class="mdlb-dark">${body}</div>` : body
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8"><style>
:root{${TOKENS}}
html,body{margin:0;background:var(--dsw-alias-bg-base)}
body{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC","Helvetica Neue",Arial,sans-serif}
#root{width:${width}px;height:${height}px}
${dark ? '.mdlb-dark{height:100%}' : ''}
</style></head><body><div id="root">${wrapper}</div></body></html>`
}

fs.mkdirSync(outDir, { recursive: true })
for (const tab of tabList) {
  const file = join(outDir, `${tab}${dark ? '-dark' : ''}${openKey ? '-open' : ''}-${width}x${height}.html`)
  fs.writeFileSync(file, pageFor(tab))
  console.log(file)
}
