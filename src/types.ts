export type FieldType =
  | 'text'
  | 'date'
  | 'number'
  | 'choice'
  | 'multi'
  | 'condition'
  | 'textarea'
  | 'photos'

export type FieldOption = {
  label: string
  value: string
}

export type Field = {
  id: string
  label: string
  type: FieldType
  required?: boolean
  options?: FieldOption[]
  placeholder?: string
  helper?: string
}

export type Section = {
  id: string
  title: string
  description?: string
  fields: Field[]
}

export type InspectionDraft = {
  id: string
  meta: Record<string, string>
  answers: Record<string, string | string[]>
  photos: Record<string, string[]>
  syncStatus: 'draft' | 'pending' | 'synced' | 'error'
  createdAt: string
  updatedAt: string
}

export type InspectionSummary = {
  id: string
  school: string
  city: string
  gre: string
  date: string
  syncStatus: InspectionDraft['syncStatus']
  updatedAt: string
}
