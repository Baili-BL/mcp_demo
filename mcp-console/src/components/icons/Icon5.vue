<script setup>
defineProps({
  size: { type: [Number, String], default: 14 },
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
    <path d="M832 96a96 96 0 0 1 96 96v640a96 96 0 0 1-96 96H192a96 96 0 0 1-96-96V192a96 96 0 0 1 96-96h640z m0 64H192a32 32 0 0 0-32 32v640a32 32 0 0 0 32 32h640a32 32 0 0 0 32-32V192a32 32 0 0 0-32-32z m-320 96a32 32 0 0 1 32 32v192h192a32 32 0 0 1 31.92 29.6L768 512a32 32 0 0 1-32 32H544v192a32 32 0 1 1-64 0V544H288a32 32 0 0 1-31.92-29.6L256 512a32 32 0 0 1 32-32h192V288a32 32 0 0 1 32-32z" />
  </svg>
</template>
