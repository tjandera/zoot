<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNav from './components/AppNav.vue'
import ToastHost from './components/ToastHost.vue'
import { useUserStore } from './stores/user.js'

const route = useRoute()
const user = useUserStore()
const showNav = computed(() => route.meta.nav && user.isAuthed)
</script>

<template>
  <RouterView v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>
  <AppNav v-if="showNav" />
  <ToastHost />
</template>
