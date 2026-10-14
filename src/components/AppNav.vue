<script setup>
const items = [
  { to: '/plan', icon: 'bi-signpost-split-fill', label: 'Plan' },
  { to: '/map', icon: 'bi-geo-alt-fill', label: 'Map' },
  { to: '/me', icon: 'bi-person-circle', label: 'Me' }
]
</script>

<template>
  <nav class="zt-nav zt-glass" aria-label="Main">
    <RouterLink v-for="i in items" :key="i.to" :to="i.to">
      <i class="bi" :class="i.icon" aria-hidden="true"></i>
      <span>{{ i.label }}</span>
    </RouterLink>
  </nav>
</template>
