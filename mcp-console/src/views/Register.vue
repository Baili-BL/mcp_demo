<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { findInvite, kindMeta, registerByInvite } from '../store'

defineOptions({ name: 'Register' })

const token = ref('')
const done = ref(false)
const form = reactive({ name: '', phone: '', email: '' })

function readToken() {
  const q = (location.hash.split('?')[1] || '')
  token.value = new URLSearchParams(q).get('t') || ''
  done.value = false
}

const invite = computed(() => (token.value ? findInvite(token.value) : null))
const invalid = computed(() => {
  if (!token.value) return '缺少邀请链接，请联系管理员重新发送。'
  if (!invite.value) return '邀请链接无效。'
  if (invite.value.status !== 'open') return '该链接已使用或已作废。'
  if (invite.value.expireAt && invite.value.expireAt < new Date().toISOString().slice(0, 10)) {
    return '邀请链接已过期，请联系管理员重新发送。'
  }
  return ''
})
const kind = computed(() => kindMeta(invite.value?.kind))

function submit() {
  const res = registerByInvite(token.value, form)
  if (!res.ok) { Message.warning(res.msg); return }
  done.value = true
  Message.success('注册成功，可用手机号或登录邮箱进入管理台')
}

onMounted(() => {
  readToken()
  window.addEventListener('hashchange', readToken)
})
onBeforeUnmount(() => {
  window.removeEventListener('hashchange', readToken)
})
</script>

<template>
  <div class="reg">
    <div class="reg-card">
      <p class="kicker">MCP 账号注册</p>
      <template v-if="done">
        <h1>注册完成</h1>
        <p class="lede">{{ form.name }}，你的{{ kind.label }}账号已开通。登录邮箱 {{ form.email }}，手机 {{ form.phone }}。</p>
        <a-alert style="margin-top:16px">管理员会在「接入与密钥」把 API Key 挂到你的账号。外部客户默认 90 天、低配额。</a-alert>
        <a-button type="primary" style="margin-top:20px" href="#users">返回用户管理</a-button>
      </template>
      <template v-else-if="invalid">
        <h1>无法注册</h1>
        <p class="lede">{{ invalid }}</p>
      </template>
      <template v-else>
        <a-tag :color="kind.tag">{{ kind.label }}</a-tag>
        <h1>填写手机与登录邮箱</h1>
        <p class="lede">
          {{ invite.kind === 'customer' ? (invite.org || '外部客户') : (invite.org || '内部员工') }}
          邀请你开通 MCP 账号。链接 7 天内有效。
        </p>
        <a-form :model="form" layout="vertical" style="margin-top:20px" @submit.prevent="submit">
          <a-form-item label="姓名" required>
            <a-input v-model="form.name" :placeholder="invite.nameHint || '真实姓名'" />
          </a-form-item>
          <a-form-item label="手机号" required extra="用于登录与找回">
            <a-input v-model="form.phone" placeholder="11 位手机号" maxlength="11" />
          </a-form-item>
          <a-form-item :label="invite.kind === 'staff' ? '登录邮箱（企业邮箱）' : '登录邮箱'" required extra="登录账号，不是联系备用邮箱">
            <a-input v-model="form.email" placeholder="name@example.com" />
          </a-form-item>
          <a-button type="primary" long size="large" @click="submit">提交注册</a-button>
        </a-form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.reg {
  min-height: calc(100vh - 72px);
  display: grid;
  place-items: start center;
  padding: 48px 20px 80px;
  background: #faf9f7;
}
.reg-card {
  width: min(480px, 100%);
  background: #fff;
  border: 1px solid #eceae4;
  border-radius: 16px;
  padding: 36px 32px 40px;
}
.kicker {
  font-size: 12px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: #c2410c;
  font-weight: 600;
  margin-bottom: 12px;
}
h1 {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 10px 0 8px;
}
.lede { color: var(--color-text-2); font-size: 14px; line-height: 1.6; }
</style>
