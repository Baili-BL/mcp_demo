<script setup>
defineProps({ size: { type: [Number, String], default: 16 } })
</script>
<template>
  <svg class="aliyun-ico" :width="size" :height="size" viewBox="0 0 1024 1024" aria-hidden="true" fill="currentColor">
    <path d="M512 64c247.424 0 448 200.576 448 448S759.424 960 512 960 64 759.424 64 512 264.576 64 512 64z m0 64C299.92 128 128 299.92 128 512s171.92 384 384 384 384-171.92 384-384S724.08 128 512 128z m-75.536 201.36L700.8 498.08a32 32 0 0 1-0.832 54.464L435.632 710.08c-21.344 12.704-48.384-2.656-48.384-27.488V356.32c0-25.28 27.92-40.576 49.216-26.976z m14.784 85.344v211.552l171.392-102.144-171.392-109.408z" />
  </svg>
</template>
