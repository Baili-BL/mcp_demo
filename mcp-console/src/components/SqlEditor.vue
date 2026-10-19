<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { basicSetup } from 'codemirror'
import { EditorView, keymap, Decoration, MatchDecorator, ViewPlugin, placeholder as cmPlaceholder } from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import { indentWithTab } from '@codemirror/commands'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { sql, MySQL, PLSQL } from '@codemirror/lang-sql'
import { tags as t } from '@lezer/highlight'

const props = defineProps({
  modelValue: { type: String, default: '' },
  dialect: { type: String, default: 'mysql' },
  schema: { type: Object, default: () => ({}) },
  placeholder: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'run', 'format'])

const host = ref(null)
let view = null
const langConf = new Compartment()
const roConf = new Compartment()

const sqlHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: '#0b3fbf', fontWeight: '600' },
  { tag: [t.typeName, t.standard(t.typeName)], color: '#8a3ffc' },
  { tag: [t.function(t.variableName), t.standard(t.name)], color: '#0e7c86' },
  { tag: [t.string, t.special(t.string)], color: '#1a7f37' },
  { tag: [t.number, t.bool, t.null], color: '#c2410c' },
  { tag: [t.lineComment, t.blockComment, t.comment], color: '#8c94a3', fontStyle: 'italic' },
  { tag: [t.operator, t.compareOperator, t.arithmeticOperator], color: '#a21caf' },
  { tag: [t.punctuation, t.separator, t.paren, t.bracket], color: '#5c6370' },
  { tag: t.special(t.name), color: '#9a6700' },
  { tag: t.name, color: '#1d2129' },
])

const phMatcher = new MatchDecorator({
  regexp: /\$(val|expr|condition|accel|tag|system)\{[^}\n]*\}(?:\.get\(\d\))?|\$\{[^}\n]*\}/g,
  decoration: (m) => Decoration.mark({ class: `cm-ph cm-ph-${m[1] || 'val'}` }),
})
const phHighlight = ViewPlugin.fromClass(class {
  constructor(v) { this.decorations = phMatcher.createDeco(v) }
  update(u) { this.decorations = phMatcher.updateDeco(u, this.decorations) }
}, { decorations: (v) => v.decorations })

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#f7f8fa', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace", lineHeight: '1.65' },
  '.cm-content': { padding: '12px 0', caretColor: '#165dff' },
  '.cm-gutters': { backgroundColor: '#eef0f4', color: '#a0a7b4', border: 'none', borderRight: '1px solid #e1e5eb' },
  '.cm-activeLine': { backgroundColor: 'rgba(22, 93, 255, 0.05)' },
  '.cm-activeLineGutter': { backgroundColor: '#e3e8f1', color: '#4e5969' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#cfe0ff !important' },
  '.cm-matchingBracket': { backgroundColor: '#dbe7ff', outline: '1px solid #9db8f5' },
  '.cm-placeholder': { color: '#a0a7b4' },
  '.cm-tooltip-autocomplete': { fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: '12px' },
})

function langFor(dialect, schema) {
  return sql({ dialect: dialect === 'oracle' ? PLSQL : MySQL, schema, upperCaseKeywords: true })
}

onMounted(() => {
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.modelValue || '',
      extensions: [
        basicSetup,
        keymap.of([
          indentWithTab,
          { key: 'Mod-Enter', run: () => { emit('run'); return true } },
          { key: 'Shift-Alt-f', run: () => { emit('format'); return true } },
        ]),
        langConf.of(langFor(props.dialect, props.schema)),
        roConf.of(EditorState.readOnly.of(props.readonly)),
        syntaxHighlighting(sqlHighlight),
        phHighlight,
        theme,
        EditorView.lineWrapping,
        props.placeholder ? cmPlaceholder(props.placeholder) : [],
        EditorView.updateListener.of((u) => {
          if (u.docChanged) emit('update:modelValue', u.state.doc.toString())
        }),
      ],
    }),
  })
})

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

watch(() => props.modelValue, (v) => {
  if (!view) return
  const cur = view.state.doc.toString()
  if ((v || '') === cur) return
  const head = Math.min(view.state.selection.main.head, (v || '').length)
  view.dispatch({ changes: { from: 0, to: cur.length, insert: v || '' }, selection: { anchor: head } })
})

watch(() => [props.dialect, props.schema], () => {
  view?.dispatch({ effects: langConf.reconfigure(langFor(props.dialect, props.schema)) })
})

watch(() => props.readonly, (v) => {
  view?.dispatch({ effects: roConf.reconfigure(EditorState.readOnly.of(v)) })
})

function insertAtCursor(text) {
  if (!view) return
  const { from, to } = view.state.selection.main
  const before = view.state.doc.sliceString(0, from)
  const ins = (from > 0 && !/\s$/.test(before) ? ' ' : '') + text
  view.dispatch({ changes: { from, to, insert: ins }, selection: { anchor: from + ins.length }, scrollIntoView: true })
  view.focus()
}

function focus() {
  view?.focus()
}

defineExpose({ insertAtCursor, focus })
</script>

<template>
  <div ref="host" class="sql-cm" />
</template>

<style scoped>
.sql-cm { height: 100%; min-height: 0; overflow: hidden; }
.sql-cm :deep(.cm-editor) { height: 100%; }
.sql-cm :deep(.cm-ph) { border-radius: 3px; padding: 0 1px; font-weight: 600; }
.sql-cm :deep(.cm-ph *) { color: inherit !important; font-style: normal !important; }
.sql-cm :deep(.cm-ph-val) { color: #d4380d !important; background: #fff1e8; }
.sql-cm :deep(.cm-ph-expr) { color: #0958d9 !important; background: #e8f1ff; }
.sql-cm :deep(.cm-ph-condition) { color: #531dab !important; background: #f3ecff; }
.sql-cm :deep(.cm-ph-accel) { color: #08979c !important; background: #e6fbfb; }
.sql-cm :deep(.cm-ph-tag) { color: #c41d7f !important; background: #ffeef7; }
.sql-cm :deep(.cm-ph-system) { color: #7c5800 !important; background: #fff7d6; }
</style>
