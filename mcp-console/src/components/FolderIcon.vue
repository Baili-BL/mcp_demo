<script setup>
defineProps({
  open: { type: Boolean, default: false },
})
</script>

<template>
  <svg
    class="folder-ico"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <template v-if="open">
      <path fill="#E8B84A" d="M1.5 4.2c0-.7.6-1.3 1.3-1.3h2.4c.3 0 .6.1.8.3l.9.8c.2.2.5.3.8.3h5.5c.7 0 1.3.6 1.3 1.3v.7H1.5V4.2Z" />
      <path fill="#F5C84C" d="M1.2 6.4h13.3c.6 0 1 .5.9 1.1l-1.2 6c-.1.6-.6 1-1.2 1H3.6c-.6 0-1.1-.4-1.2-1L.3 7.5c-.1-.6.3-1.1.9-1.1Z" />
      <path fill="#FFE08A" d="M2.4 7.6h11.2l-.9 4.6c0 .2-.3.4-.5.4H3.8c-.2 0-.4-.2-.5-.4L2.4 7.6Z" />
    </template>
    <template v-else>
      <path fill="#E8B84A" d="M1.6 3.4c0-.7.6-1.2 1.2-1.2h2.5c.3 0 .6.1.8.3l1 .9c.2.2.5.3.8.3h5.3c.7 0 1.2.5 1.2 1.2v.6H1.6v-2.1Z" />
      <path fill="#F5C84C" d="M1.6 5.5h12.8c.7 0 1.2.5 1.2 1.2v6.1c0 .7-.5 1.2-1.2 1.2H2.8c-.7 0-1.2-.5-1.2-1.2V5.5Z" />
      <path fill="#FFE08A" d="M2.7 6.7h10.6v5.8c0 .2-.2.4-.4.4H3.1c-.2 0-.4-.2-.4-.4V6.7Z" />
    </template>
  </svg>
</template>

<style scoped>
.folder-ico {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: block;
}
</style>
