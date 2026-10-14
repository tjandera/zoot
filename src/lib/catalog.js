import { shallowRef } from 'vue'
import bundled from '../data/places.sg.json'
import walkMatrix from '../data/walk-matrix.sg.json'
import { getDb } from './db/index.js'
import { nearestHub, setWalkMatrix } from './travel.js'

setWalkMatrix(walkMatrix)

/**
 * Place catalog. Supabase `places` is the source of truth when connected;
 * the bundled JSON (also used to generate supabase/seed.sql) keeps guest mode
 * and offline demos working.
 */
export const catalog = shallowRef(prepare(bundled))
export const placeById = shallowRef(new Map(catalog.value.map((p) => [p.id, p])))

let loaded = false

function prepare(list) {
  return list.map((p) => ({
    ...p,
    tags: p.tags || [],
    mrt: p.mrt || nearestHub(p).name
  }))
}

export async function loadCatalog() {
  if (loaded) return catalog.value
  loaded = true
  try {
    const db = await getDb()
    const rows = await db.listPlaces()
    if (rows?.length) {
      catalog.value = prepare(rows)
      placeById.value = new Map(catalog.value.map((p) => [p.id, p]))
    }
  } catch (err) {
    console.warn('[catalog] using bundled places:', err.message)
  }
  return catalog.value
}
