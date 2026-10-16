<script setup>
defineProps({
  type: { type: String, default: 'mysql' },
})
</script>

<template>
  <span class="db-ico" :data-type="type" aria-hidden="true">
    <!-- MySQL: official-style dolphin + wordmark color -->
    <svg v-if="type === 'mysql'" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#F3FBFD"/>
      <path d="M6.8 19.2c1.8 5 6 7.6 11.2 7.6 6.8 0 11.2-4.6 11.2-9.8 0-3.6-2.2-6.6-5.8-7.8 1.8 3.4.6 7.2-2.6 8.6-3 1.4-6.6.2-8.2-2.6-.4 1.8.2 3.6 1.8 4.6-3.6-.2-6.2-2.6-7.6-5.8-.4 1.8-.4 3.4 0 5.2z" fill="#00758F"/>
      <path d="M23.2 9c.8 1.6.8 3.8 0 5.4 2.4.8 4.2-1 4.6-3.4-.8-1.4-2.6-2.2-4.6-2z" fill="#F29111"/>
      <circle cx="21" cy="12.4" r="1.15" fill="#102A43"/>
    </svg>
    <!-- ClickHouse bars -->
    <svg v-else-if="type === 'clickhouse'" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="8" width="5" height="16" rx="1" fill="#FCD000"/>
      <rect x="11.5" y="4" width="5" height="24" rx="1" fill="#FCD000"/>
      <rect x="19" y="10" width="5" height="12" rx="1" fill="#FCD000"/>
      <rect x="26.2" y="13" width="2.2" height="6" rx="0.6" fill="#FFCC00" opacity=".55"/>
    </svg>
    <!-- Hive elephant-ish hex -->
    <svg v-else-if="type === 'hive'" viewBox="0 0 32 32" fill="none">
      <path d="M16 3.5 27 10v12L16 28.5 5 22V10L16 3.5z" fill="#FDE350" stroke="#E6B800" stroke-width="1.2"/>
      <path d="M16 8v16M9.2 12.2 16 16l6.8-3.8M9.2 19.8 16 16l6.8 3.8" stroke="#C48A00" stroke-width="1.3"/>
    </svg>
    <!-- Oracle -->
    <svg v-else-if="type === 'oracle'" viewBox="0 0 32 32" fill="none">
      <ellipse cx="16" cy="16" rx="11" ry="7.5" stroke="#F80000" stroke-width="3.2"/>
    </svg>
    <!-- PostgreSQL elephant -->
    <svg v-else-if="type === 'postgresql'" viewBox="0 0 32 32" fill="none">
      <path d="M9 20.5c.4 3.4 3.2 5.5 7.4 5.5 5.8 0 8.6-3.2 8.6-7.6 0-3.6-2.2-5.8-6-6.6 1.6-2.4.6-5.2-2.2-5.8-2.2-.4-4.2.8-4.8 2.8C9.6 9.6 8 12.2 8 15.4c0 1.8.4 3.4 1 5.1z" fill="#336791"/>
      <circle cx="14.2" cy="14.2" r="1.15" fill="#fff"/>
      <path d="M20.5 22.8c1.8.8 3.6.4 4.6-1.2" stroke="#336791" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    <!-- SQL Server -->
    <svg v-else-if="type === 'sqlserver'" viewBox="0 0 32 32" fill="none">
      <path d="M8 8h16l-2.2 16H10.2L8 8z" fill="#A91D2A"/>
      <path d="M10.4 11h11.2l-.4 3H12l.3 2.4h8.4l-.9 6.2h-3.6l.5-3.4h-3.2L10.4 11z" fill="#fff"/>
    </svg>
    <!-- MongoDB leaf -->
    <svg v-else-if="type === 'mongodb'" viewBox="0 0 32 32" fill="none">
      <path d="M16 3.5s7.4 6.2 7.4 14.2c0 5.4-3 8.8-7.4 10.8-4.4-2-7.4-5.4-7.4-10.8C8.6 9.7 16 3.5 16 3.5z" fill="#10AA50"/>
      <path d="M16 6.2c.4 6.4.6 11.4 0 19.2" stroke="#B8C4C2" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
    <!-- Apache Doris -->
    <svg v-else-if="type === 'doris'" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" fill="#1D4ED8"/>
      <path d="M10 20.5 16 9.5l6 11H10z" fill="#fff"/>
      <circle cx="16" cy="17.5" r="2.2" fill="#1D4ED8"/>
    </svg>
    <!-- StarRocks -->
    <svg v-else-if="type === 'starrocks'" viewBox="0 0 32 32" fill="none">
      <path d="M16 3.8 19.4 13H29l-7.8 5.7 3 9.3L16 22.6 7.8 28l3-9.3L3 13h9.6L16 3.8z" fill="#FF6A2A"/>
    </svg>
    <!-- TiDB -->
    <svg v-else-if="type === 'tidb'" viewBox="0 0 32 32" fill="none">
      <path d="M16 4 28 11v10L16 28 4 21V11L16 4z" fill="#E31C25"/>
      <path d="M16 10.2 22.6 14v4L16 21.8 9.4 18v-4L16 10.2z" fill="#fff"/>
    </svg>
    <!-- 达梦 -->
    <svg v-else-if="type === 'dameng'" viewBox="0 0 32 32" fill="none">
      <rect x="4" y="4" width="24" height="24" rx="6" fill="#C8161D"/>
      <text x="16" y="21" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="PingFang SC, Microsoft YaHei, sans-serif">达</text>
    </svg>
    <!-- HTTP -->
    <svg v-else-if="type === 'http'" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="11" stroke="#165DFF" stroke-width="2"/>
      <ellipse cx="16" cy="16" rx="5.5" ry="11" stroke="#165DFF" stroke-width="1.6"/>
      <path d="M5.5 16h21M7.2 11h17.6M7.2 21h17.6" stroke="#165DFF" stroke-width="1.5"/>
    </svg>
    <svg v-else viewBox="0 0 32 32" fill="none">
      <rect x="5" y="7" width="22" height="18" rx="3" fill="#86909C"/>
      <path d="M9 13h14M9 17h10" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  </span>
</template>

<style scoped>
.db-ico {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.db-ico svg {
  width: 28px;
  height: 28px;
  display: block;
}
</style>
