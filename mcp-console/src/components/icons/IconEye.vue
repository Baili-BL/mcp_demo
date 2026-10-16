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
    <path d="M512 192c247.424 0 448 143.264 448 320S759.424 832 512 832 64 688.736 64 512s200.576-320 448-320z m0 64C296.192 256 128 376.128 128 512s168.192 256 384 256 384-120.128 384-256-168.192-256-384-256z m0 64c106.032 0 192 85.968 192 192s-85.968 192-192 192-192-85.968-192-192 85.968-192 192-192z m0 64a128 128 0 1 0 0 256 128 128 0 0 0 0-256z" />
  </svg>
</template>
