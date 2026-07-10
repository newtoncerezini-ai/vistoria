import { openDB, type DBSchema } from 'idb'
import type { InspectionDraft, InspectionSummary } from './types'

const DB_NAME = 'seepe-vistorias'
const DB_VERSION = 1
const STORE = 'inspections'

type InspectionDb = DBSchema & {
  inspections: {
    key: string
    value: InspectionDraft
    indexes: {
      'by-updatedAt': string
    }
  }
}

function db() {
  return openDB<InspectionDb>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      const store = database.createObjectStore(STORE, { keyPath: 'id' })
      store.createIndex('by-updatedAt', 'updatedAt')
    },
  })
}

export function createInspectionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `inspection-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function saveInspection(inspection: InspectionDraft) {
  const database = await db()
  await database.put(STORE, inspection)
}

export async function getInspection(id: string) {
  const database = await db()
  return database.get(STORE, id)
}

export async function deleteInspection(id: string) {
  const database = await db()
  await database.delete(STORE, id)
}

export async function listInspections(): Promise<InspectionSummary[]> {
  const database = await db()
  const inspections = await database.getAllFromIndex(STORE, 'by-updatedAt')

  return inspections
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((inspection) => ({
      id: inspection.id,
      school: inspection.meta.school || 'Escola não informada',
      city: inspection.meta.city || 'Município não informado',
      gre: inspection.meta.gre || 'GRE não informada',
      date: inspection.meta.date || '',
      syncStatus: inspection.syncStatus,
      updatedAt: inspection.updatedAt,
    }))
}
