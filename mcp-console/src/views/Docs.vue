<script setup>
import { computed, ref } from 'vue'

const GROUPS = [
  {
    id: 'design',
    title: '设计规范',
    items: [
      { id: 'icon', title: '系统 Icon 设计', src: '/docs/mcp-icon/index.html' },
    ],
  },
  {
    id: 'product',
    title: '产品设计',
    items: [
      { id: 'users', title: '用户管理与注册', src: '/docs/users.html' },
      { id: 'register', title: '服务与工具注册', src: '/docs/register.html' },
    ],
  },
  {
    id: 'flow',
    title: '接入流程',
    items: [
      { id: 'mcp-tools', title: 'MCP 工具概览', src: '/docs/mcp-tools.html' },
      { id: 'sequence', title: '时序图文档', src: '/docs/sequence.html' },
    ],
  },
  {
    id: 'eng',
    title: '开发规范',
    items: [
      { id: 'eng-flow', title: '工程开发流程图', src: '/docs/eng-flow.html' },
      { id: 'mcp-dev', title: 'MCP 服务代码规范', src: '/docs/mcp-dev.html' },
    ],
  },
]

const currentId = ref('icon')
const current = computed(() => {
  for (const g of GROUPS) {
    const hit = g.items.find((i) => i.id === currentId.value)
    if (hit) return hit
  }
  return GROUPS[0].items[0]
})
</script>

<template>
  <div class="docs-shell">
    <aside class="docs-nav">
      <div class="docs-nav-hd">文档目录</div>
      <div v-for="g in GROUPS" :key="g.id" class="docs-group">
        <div class="docs-group-t">{{ g.title }}</div>
        <button
          v-for="item in g.items"
          :key="item.id"
          type="button"
          class="docs-item"
          :class="{ on: currentId === item.id }"
          @click="currentId = item.id"
        >
          {{ item.title }}
        </button>
      </div>
    </aside>
    <div class="docs-body">
      <iframe
        class="docs-frame"
        :key="current.id"
        :src="current.src"
        :title="current.title"
      />
    </div>
  </div>
</template>

<style scoped>
.docs-shell {
  display: flex;
  height: 100%;
  min-height: calc(100vh - 72px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.docs-nav {
  width: 220px;
  flex-shrink: 0;
  background: #f6f6fc;
  padding: 8px 12px 18px;
  overflow: auto;
}
.docs-nav-hd {
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: rgb(11, 11, 15);
}
.docs-group-t {
  padding: 12px 12px 6px;
  font-size: 12px;
  color: rgb(115, 122, 135);
  letter-spacing: 0.02em;
}
.docs-item {
  width: 100%;
  height: 40px;
  margin: 0 0 4px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgb(11, 11, 15);
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  line-height: 40px;
  text-align: left;
}
.docs-item:hover { background: rgb(235, 235, 245); }
.docs-item.on {
  background: rgb(235, 235, 245);
  font-weight: 500;
}
.docs-body {
  flex: 1;
  min-width: 0;
  height: 100%;
  background: #faf9f7;
}
.docs-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #faf9f7;
}
</style>
