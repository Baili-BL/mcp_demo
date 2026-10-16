<script setup>
defineProps({
  size: { type: [Number, String], default: 16 },
})
</script>

<template>
  <svg
    class="aliyun-ico"
    :width="size"
    :height="size"
    viewBox="0 0 1024 1024"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M480 800h64a48 48 0 0 1 48 48v64a48 48 0 0 1-48 48h-64a48 48 0 0 1-48-48v-64a48 48 0 0 1 48-48z m0-368h64a48 48 0 0 1 48 48v64a48 48 0 0 1-48 48h-64a48 48 0 0 1-48-48v-64a48 48 0 0 1 48-48z m0-368h64a48 48 0 0 1 48 48v64a48 48 0 0 1-48 48h-64a48 48 0 0 1-48-48V112a48 48 0 0 1 48-48z" />
  </svg>
</template>
