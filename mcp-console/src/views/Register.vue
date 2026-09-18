<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { findInvite, registerByInvite } from '../store'

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

function submit() {
  const res = registerByInvite(token.value, form)
  if (!res.ok) { Message.warning(res.msg); return }
  done.value = true
  Message.success('注册成功')
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
        <p class="lede">{{ form.name }}，账号已开通。可用手机 {{ form.phone }}{{ form.email ? ' 或登录邮箱 ' + form.email : '' }} 进入。</p>
        <p class="done-tip">你可以关闭此页面。管理员会在接入后为你签发 API Key。</p>
      </template>
      <template v-else-if="invalid">
        <h1>无法注册</h1>
        <p class="lede">{{ invalid }}</p>
      </template>
      <template v-else>
        <h1>填写注册信息</h1>
        <p class="lede">请填写以下信息完成开通。链接 7 天内有效。</p>
        <a-form :model="form" layout="vertical" class="reg-form" @submit.prevent="submit">
          <a-form-item label="姓名" required>
            <a-input
              v-model="form.name"
              :placeholder="invite.nameHint || '真实姓名'"
              autocomplete="name"
              size="large"
            />
          </a-form-item>
          <a-form-item label="手机号" required extra="用于登录与找回">
            <a-input
              v-model="form.phone"
              placeholder="11 位手机号"
              maxlength="11"
              inputmode="numeric"
              autocomplete="tel"
              size="large"
            />
          </a-form-item>
          <a-form-item label="登录邮箱" extra="选填，填写后可作为登录账号">
            <a-input
              v-model="form.email"
              type="email"
              placeholder="选填，如 name@example.com"
              autocomplete="email"
              size="large"
            />
          </a-form-item>
          <a-button type="primary" html-type="submit" long size="large" class="reg-submit" @click="submit">
            提交注册
          </a-button>
        </a-form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.reg {
  min-height: 100%;
  display: grid;
  place-items: start center;
  padding: 40px 20px 64px;
  background: #faf9f7;
  box-sizing: border-box;
}
.reg-card {
  width: min(480px, 100%);
  background: #fff;
  border: 1px solid #eceae4;
  border-radius: 16px;
  padding: 36px 32px 40px;
  box-sizing: border-box;
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
  line-height: 1.25;
}
.lede { color: var(--color-text-2); font-size: 14px; line-height: 1.6; }
.done-tip { margin: 16px 0 0; font-size: 13px; color: var(--color-text-3); line-height: 1.6; }
.reg-form { margin-top: 20px; }
.reg-submit { margin-top: 4px; height: 44px; }

@media (max-width: 640px) {
  .reg {
    padding: 0;
    place-items: stretch;
    background: #fff;
    min-height: 100%;
  }
  .reg-card {
    width: 100%;
    min-height: 100%;
    border: none;
    border-radius: 0;
    padding: 20px 20px calc(28px + env(safe-area-inset-bottom, 0px));
  }
  .kicker { display: none; }
  h1 { font-size: 22px; margin-top: 4px; }
  .lede { font-size: 14px; }
  .reg-submit { height: 48px; font-size: 16px; }
  :deep(.arco-input-wrapper),
  :deep(.arco-input-wrapper .arco-input),
  :deep(.arco-input) {
    font-size: 16px !important;
    min-height: 44px;
  }
  :deep(.arco-form-item) { margin-bottom: 18px; }
  :deep(.arco-form-item-label-col) { margin-bottom: 6px; }
}
</style>
