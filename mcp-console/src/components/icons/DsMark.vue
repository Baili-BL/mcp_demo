<script setup>
defineProps({
  size: { type: [Number, String], default: 10 },
})
</script>

<template>
  <i class="ds-mark">
    <svg
      class="aliyun-ico"
      :width="size"
      :height="size"
      viewBox="0 0 1024 1024"
      aria-hidden="true"
    >
      <path
        fill="#FFFFFF"
        d="M186.88 353.450667c1.706667 0 3.413333 0.341333 4.949333 0.853333l291.498667 109.397333a14.250667 14.250667 0 0 1 9.301333 13.312V846.506667a14.250667 14.250667 0 0 1-19.285333 13.312l-291.498667-109.226667a14.250667 14.250667 0 0 1-9.216-13.397333V367.786667c0-7.850667 6.314667-14.250667 14.165334-14.250667z m691.456 0c7.936 0 14.250667 6.4 14.250667 14.250666V737.28c0 5.973333-3.669333 11.264-9.216 13.312l-291.584 109.312a14.250667 14.250667 0 0 1-19.2-13.312V477.013333c0-5.973333 3.669333-11.264 9.216-13.312l291.584-109.312a14.250667 14.250667 0 0 1 4.949333-0.938666z m-340.48-267.093334l347.648 136.106667a14.250667 14.250667 0 0 1 0 26.453333L537.770667 385.109333a14.250667 14.250667 0 0 1-10.325334 0L179.712 248.917333a14.250667 14.250667 0 0 1 0-26.453333L527.36 86.272a14.250667 14.250667 0 0 1 10.325333 0z"
      />
    </svg>
  </i>
</template>

<style scoped>
.ds-mark {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 14px;
  height: 18px;
  margin-right: 8px;
  border-radius: 2px;
  background-image: linear-gradient(rgb(102, 102, 255), rgb(140, 128, 255));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.aliyun-ico { display: block; overflow: hidden; }
</style>
