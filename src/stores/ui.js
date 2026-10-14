import { defineStore } from 'pinia'
import { fetchForecast } from '../lib/weather.js'

/** Theme, toasts and weather (Matthew + Hulbert lanes). */
export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: document.documentElement.getAttribute('data-bs-theme') || 'light',
    toasts: [],
    weather: null,
    weatherError: null
  }),
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-bs-theme', this.theme)
      try { localStorage.setItem('zoot.theme', this.theme) } catch {}
    },
    toast(message, variant = 'dark', ms = 3200) {
      const id = Math.random().toString(36).slice(2)
      this.toasts.push({ id, message, variant })
      setTimeout(() => { this.toasts = this.toasts.filter((t) => t.id !== id) }, ms)
    },
    async loadWeather(lat, lng) {
      try {
        this.weather = await fetchForecast(lat, lng)
        this.weatherError = null
      } catch (err) {
        this.weatherError = err.message
      }
      return this.weather
    }
  }
})
