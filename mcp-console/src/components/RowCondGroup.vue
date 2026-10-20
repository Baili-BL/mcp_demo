<script setup>
import { inject } from 'vue'
import { isRowGroup } from '../store'
import RowCondGroup from './RowCondGroup.vue'

const props = defineProps({
  group: { type: Object, required: true },
  depth: { type: Number, default: 0 },
})
const emit = defineEmits(['remove'])
const ctx = inject('rowCtx')

function addCondition() {
  const prev = [...props.group.conditions].reverse().find((n) => !isRowGroup(n))
  props.group.conditions.push(ctx.newCond(prev?.column))
}

function addRelation(node) {
  node.sub = {
    id: ctx.uid('b'),
    join: 'or',
    conditions: [ctx.newCond(node.column), ctx.newCond(node.column)],
  }
}

function removeAt(i) {
  props.group.conditions.splice(i, 1)
  if (props.group.conditions.length) return
  if (props.depth > 0) emit('remove')
  else props.group.conditions.push(ctx.newCond())
}

function removeSub(node) {
  delete node.sub
}

function toggleJoin() {
  props.group.join = props.group.join === 'and' ? 'or' : 'and'
}

const canRemoveCond = () => props.depth > 0 || props.group.conditions.length > 1
const canNest = () => props.depth < ctx.maxDepth - 1
</script>

<template>
  <div class="block" :class="{ nested: depth > 0, single: group.conditions.length < 2 }">
    <div class="join-rail">
      <button type="button" class="join-pill" :class="group.join" title="单击切换本组条件间的且 / 或" @click="toggleJoin">
        {{ group.join === 'and' ? '且' : '或' }}
        <icon-swap :size="10" />
      </button>
    </div>
    <div class="block-body">
      <template v-for="(node, i) in group.conditions" :key="node.id">
        <RowCondGroup v-if="isRowGroup(node)" :group="node" :depth="depth + 1" @remove="removeAt(i)" />
        <div v-else class="cond">
          <div class="cond-grid">
            <a-select
              :model-value="node.column"
              allow-search
              size="small"
              placeholder="筛选字段"
              @change="(v) => ctx.onColumnChange(node, v)"
            >
              <a-option v-for="c in ctx.columns.value" :key="c.column_name" :value="c.column_name">
                {{ c.column_name }}
                <span class="opt-kind">{{ ctx.measureOf(c.column_name) ? '度量' : '维度' }}</span>
              </a-option>
            </a-select>
            <a-select :model-value="node.method" size="small" @change="(v) => ctx.onMethodChange(node, v)">
              <a-option v-for="m in ctx.methodsOf(node.column)" :key="m.value" :value="m.value">{{ m.label }}</a-option>
            </a-select>
            <a-select v-if="node.method === 'enum'" v-model="node.op" size="small">
              <a-option v-for="o in ctx.ENUM_OPS" :key="o.value" :value="o.value">{{ o.label }}</a-option>
            </a-select>
            <a-select v-else v-model="node.op" size="small">
              <a-option v-for="o in ctx.opsOf(node)" :key="o.value" :value="o.value">{{ o.label }}</a-option>
            </a-select>

            <div class="val">
              <a-select
                v-if="node.method === 'enum'"
                v-model="node.values"
                multiple
                allow-search
                allow-create
                allow-clear
                size="small"
                placeholder="搜索并选择枚举值"
              >
                <a-option v-for="s in ctx.enumOptions(node)" :key="s" :value="s">{{ s }}</a-option>
              </a-select>
              <template v-else>
                <span v-if="node.op === 'empty' || node.op === 'not_empty'" class="muted">无需填写值</span>
                <div v-else class="val-pair">
                  <a-input v-model="node.value" size="small" :placeholder="node.op === 'between' ? '起始值' : '值'" />
                  <template v-if="node.op === 'between'">
                    <span class="muted">~</span>
                    <a-input v-model="node.value2" size="small" placeholder="结束值" />
                  </template>
                </div>
              </template>
            </div>

            <div class="row-ops">
              <a-tooltip :content="node.sub ? '已添加子关系' : canNest() ? '添加关系：在此条件的结果中再筛选' : `最多嵌套 ${ctx.maxDepth} 层`">
                <button type="button" class="op-btn" :disabled="!!node.sub || !canNest()" @click="addRelation(node)">
                  <icon-branch />
                </button>
              </a-tooltip>
              <a-tooltip content="删除条件">
                <button type="button" class="op-btn danger" :disabled="!canRemoveCond()" @click="removeAt(i)">
                  <icon-delete />
                </button>
              </a-tooltip>
            </div>
          </div>
        </div>
        <div v-if="!isRowGroup(node) && node.sub" class="sub-wrap">
          <div class="sub-tag"><icon-branch /> 在「{{ node.column || '该条件' }}」的结果中再筛选</div>
          <RowCondGroup :group="node.sub" :depth="depth + 1" @remove="removeSub(node)" />
        </div>
      </template>
      <div class="cond-actions">
        <button type="button" class="add-btn" @click="addCondition"><icon-plus /> 添加条件</button>
        <button v-if="depth > 0" type="button" class="del-btn" @click="emit('remove')">删除此关系</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.block {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 6px;
}
.block.nested {
  padding: 8px 10px 4px 4px;
  border-radius: 8px;
  background: #f7f9fc;
  border: 1px solid #e8edf5;
}
.join-rail {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.join-rail::before {
  content: '';
  position: absolute;
  top: 14px;
  bottom: 34px;
  left: 50%;
  border-left: 1px solid #c9d4e5;
}
.block.single .join-rail { visibility: hidden; }
.join-pill {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 3px 0;
  width: 24px;
  border-radius: 12px;
  border: 1px solid #bedaff;
  background: #fff;
  color: rgb(22, 100, 255);
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
}
.join-pill.or { border-color: #ffd8a8; color: #d46b08; }
.join-pill:hover { background: #f2f7ff; }
.join-pill.or:hover { background: #fff7e8; }
.block-body { min-width: 0; }
.cond {
  padding: 8px 8px 8px 10px;
  margin-bottom: 8px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  transition: border-color .15s, box-shadow .15s;
}
.cond:hover { border-color: #bedaff; box-shadow: 0 1px 4px rgba(22, 100, 255, 0.06); }
.cond-grid {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) 108px 92px minmax(140px, 2fr) auto;
  align-items: center;
  gap: 8px;
}
.opt-kind { margin-left: 6px; font-size: 12px; color: #a0a7b4; }
.val { min-width: 0; }
.val-pair { display: flex; align-items: center; gap: 6px; }
.row-ops { display: inline-flex; gap: 2px; }
.op-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: none;
  color: #4e5969;
  cursor: pointer;
}
.op-btn:hover:not(:disabled) { background: #f2f3f5; color: rgb(22, 100, 255); }
.op-btn.danger:hover:not(:disabled) { color: #f53f3f; background: #fff1f0; }
.op-btn:disabled { color: #c9cdd4; cursor: not-allowed; }
.sub-wrap {
  position: relative;
  margin: -2px 0 10px 18px;
  padding: 6px 0 0 14px;
  border-left: 2px solid #bedaff;
}
.sub-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  padding: 0 8px;
  line-height: 22px;
  border-radius: 4px;
  background: #e8f3ff;
  color: rgb(22, 100, 255);
  font-size: 12px;
}
.cond-actions { display: flex; align-items: center; gap: 12px; margin: 0 0 6px; }
.add-btn, .del-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
}
.add-btn { border: 1px dashed #bedaff; background: #fff; color: rgb(22, 100, 255); }
.add-btn:hover { background: #f2f7ff; border-color: rgb(22, 100, 255); }
.del-btn { border: none; background: none; color: #f53f3f; padding: 0 4px; }
.del-btn:hover { text-decoration: underline; }
</style>
