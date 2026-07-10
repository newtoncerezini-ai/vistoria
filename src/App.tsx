import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FileDown,
  ListChecks,
  Plus,
  Save,
  Signal,
  Trash2,
  WifiOff,
} from 'lucide-react'
import './App.css'
import { identificationFields, sections } from './formSchema'
import {
  createInspectionId,
  deleteInspection,
  getInspection,
  listInspections,
  saveInspection,
} from './offlineStorage'
import { municipalities, schools } from './schoolData'
import type { Field, InspectionDraft, InspectionSummary } from './types'

const STORAGE_KEY = 'seepe-inspection-draft'

function createEmptyDraft(): InspectionDraft {
  const now = new Date().toISOString()

  return {
    id: createInspectionId(),
  meta: {
    school: 'ESCOLA DE REFERENCIA EM ENSINO FUNDAMENTAL DOM JUVENCIO BRITTO',
    schoolInep: '26075709',
    city: 'GARANHUNS',
    gre: 'GRE AGRESTE MERIDIONAL - GARANHUNS',
    address: 'RUA PEDRO ROCHA',
    analyst: '',
    company: '',
    date: new Date().toISOString().slice(0, 10),
  },
  answers: {},
  photos: {},
    syncStatus: 'draft',
    createdAt: now,
    updatedAt: now,
  }
}

function loadLegacyDraft(): InspectionDraft | null {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    return null
  }

  try {
    const now = new Date().toISOString()
    const parsed = JSON.parse(stored) as Partial<InspectionDraft>

    return {
      ...createEmptyDraft(),
      ...parsed,
      id: parsed.id ?? createInspectionId(),
      syncStatus: parsed.syncStatus ?? 'draft',
      createdAt: parsed.createdAt ?? now,
      updatedAt: parsed.updatedAt ?? now,
    }
  } catch {
    return null
  }
}

function isFilled(value: InspectionDraft['answers'][string] | string[] | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}

function App() {
  const [draft, setDraft] = useState<InspectionDraft>(createEmptyDraft)
  const [inspections, setInspections] = useState<InspectionSummary[]>([])
  const [storageReady, setStorageReady] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    async function initializeStorage() {
      const legacyDraft = loadLegacyDraft()
      const savedInspections = await listInspections()

      if (savedInspections.length > 0) {
        const latest = await getInspection(savedInspections[0].id)
        if (latest) {
          setDraft(latest)
        }
      } else if (legacyDraft) {
        await saveInspection(legacyDraft)
        setDraft(legacyDraft)
        localStorage.removeItem(STORAGE_KEY)
      } else {
        const firstDraft = createEmptyDraft()
        await saveInspection(firstDraft)
        setDraft(firstDraft)
      }

      setInspections(await listInspections())
      setStorageReady(true)
    }

    initializeStorage()
  }, [])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)

    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (!storageReady) {
      return
    }

    const saveTimer = window.setTimeout(async () => {
      await saveInspection(draft)
      setInspections(await listInspections())
    }, 250)

    return () => window.clearTimeout(saveTimer)
  }, [draft, storageReady])

  const totals = useMemo(() => {
    const fields = sections.flatMap((section) => section.fields).filter((field) => field.type !== 'photos')
    const completed = fields.filter((field) => isFilled(draft.answers[field.id])).length
    const photos = Object.values(draft.photos).reduce((total, group) => total + group.length, 0)

    return {
      fields: fields.length,
      completed,
      photos,
      percent: Math.round((completed / fields.length) * 100),
    }
  }, [draft.answers, draft.photos])

  const section = sections[activeSection]
  const selectedSchool = useMemo(() => {
    return (
      schools.find((school) => school.inep === draft.meta.schoolInep) ??
      schools.find((school) => school.name === draft.meta.school && school.municipality === draft.meta.city)
    )
  }, [draft.meta.city, draft.meta.school, draft.meta.schoolInep])

  const schoolOptions = useMemo(() => {
    if (!draft.meta.city) {
      return schools
    }

    return schools.filter((school) => school.municipality === draft.meta.city)
  }, [draft.meta.city])

  function updateMeta(id: string, value: string) {
    setDraft((current) => ({
      ...current,
      meta: { ...current.meta, [id]: value },
      syncStatus: 'draft',
      updatedAt: new Date().toISOString(),
    }))
  }

  function selectMunicipality(value: string) {
    setDraft((current) => {
      const currentSchool = schools.find((school) => school.inep === current.meta.schoolInep)
      const shouldKeepSchool = currentSchool?.municipality === value

      return {
        ...current,
        meta: {
          ...current.meta,
          city: value,
          school: shouldKeepSchool ? current.meta.school : '',
          schoolInep: shouldKeepSchool ? current.meta.schoolInep : '',
          gre: shouldKeepSchool ? current.meta.gre : '',
          address: shouldKeepSchool ? current.meta.address : '',
        },
        syncStatus: 'draft',
        updatedAt: new Date().toISOString(),
      }
    })
  }

  function selectSchool(inep: string) {
    const school = schools.find((item) => item.inep === inep)

    if (!school) {
      updateMeta('schoolInep', '')
      return
    }

    setDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        school: school.name,
        schoolInep: school.inep,
        city: school.municipality,
        gre: school.gre,
        address: school.address,
        latitude: school.latitude,
        longitude: school.longitude,
      },
      syncStatus: 'draft',
      updatedAt: new Date().toISOString(),
    }))
  }

  function updateAnswer(id: string, value: string | string[]) {
    setDraft((current) => ({
      ...current,
      answers: { ...current.answers, [id]: value },
      syncStatus: 'draft',
      updatedAt: new Date().toISOString(),
    }))
  }

  function toggleMulti(id: string, value: string) {
    const currentValue = draft.answers[id]
    const values = Array.isArray(currentValue) ? currentValue : []
    const next = values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
    updateAnswer(id, next)
  }

  async function addPhotos(id: string, files: FileList | null) {
    if (!files?.length) {
      return
    }

    const encoded = await Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = reject
            reader.readAsDataURL(file)
          }),
      ),
    )

    setDraft((current) => ({
      ...current,
      photos: {
        ...current.photos,
        [id]: [...(current.photos[id] ?? []), ...encoded],
      },
      syncStatus: 'draft',
      updatedAt: new Date().toISOString(),
    }))
  }

  function removePhoto(id: string, index: number) {
    setDraft((current) => ({
      ...current,
      photos: {
        ...current.photos,
        [id]: (current.photos[id] ?? []).filter((_, photoIndex) => photoIndex !== index),
      },
      syncStatus: 'draft',
      updatedAt: new Date().toISOString(),
    }))
  }

  async function createNewInspection() {
    const newDraft = createEmptyDraft()
    await saveInspection(newDraft)
    setDraft(newDraft)
    setInspections(await listInspections())
    setActiveSection(0)
  }

  async function openInspection(id: string) {
    const inspection = await getInspection(id)

    if (inspection) {
      setDraft(inspection)
      setActiveSection(0)
    }
  }

  async function removeCurrentInspection() {
    const confirmed = window.confirm('Excluir esta vistoria salva neste aparelho?')

    if (confirmed) {
      await deleteInspection(draft.id)
      const remaining = await listInspections()

      if (remaining.length > 0) {
        const next = await getInspection(remaining[0].id)
        if (next) {
          setDraft(next)
        }
      } else {
        await createNewInspection()
      }

      setInspections(await listInspections())
    }
  }

  function markPendingSync() {
    setDraft((current) => {
      const next = {
        ...current,
        syncStatus: 'pending' as const,
        updatedAt: new Date().toISOString(),
      }
      void saveInspection(next).then(async () => setInspections(await listInspections()))
      return next
    })
  }

  function renderField(field: Field) {
    const value = draft.answers[field.id]

    if (field.type === 'textarea') {
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => updateAnswer(field.id, event.target.value)}
          rows={4}
        />
      )
    }

    if (field.type === 'number') {
      return (
        <input
          inputMode="numeric"
          min="0"
          type="number"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => updateAnswer(field.id, event.target.value)}
        />
      )
    }

    if (field.type === 'photos') {
      const photos = draft.photos[field.id] ?? []

      return (
        <div className="photoField">
          <label className="photoButton">
            <Camera size={18} />
            <span>Adicionar fotos</span>
            <input
              accept="image/*"
              capture="environment"
              multiple
              type="file"
              onChange={(event) => addPhotos(field.id, event.target.files)}
            />
          </label>
          {photos.length > 0 && (
            <div className="photoGrid">
              {photos.map((photo, index) => (
                <figure key={`${field.id}-${index}`}>
                  <img alt="" src={photo} />
                  <button type="button" title="Remover foto" onClick={() => removePhoto(field.id, index)}>
                    <Trash2 size={16} />
                  </button>
                </figure>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (field.type === 'multi') {
      const values = Array.isArray(value) ? value : []

      return (
        <div className="optionGrid multi">
          {field.options?.map((option) => (
            <button
              className={values.includes(option.value) ? 'selected' : ''}
              key={option.value}
              type="button"
              onClick={() => toggleMulti(field.id, option.value)}
            >
              <span>{option.label}</span>
              {values.includes(option.value) && <Check size={16} />}
            </button>
          ))}
        </div>
      )
    }

    if (field.type === 'choice' || field.type === 'condition') {
      return (
        <div className="optionGrid">
          {field.options?.map((option) => (
            <button
              className={value === option.value ? 'selected' : ''}
              key={option.value}
              type="button"
              onClick={() => updateAnswer(field.id, option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )
    }

    return (
      <input
        value={typeof value === 'string' ? value : ''}
        placeholder={field.placeholder}
        type="text"
        onChange={(event) => updateAnswer(field.id, event.target.value)}
      />
    )
  }

  function renderMetaField(field: Field) {
    if (field.id === 'school') {
      return (
        <label className="wideField" key={field.id}>
          <span>{field.label}</span>
          <select value={selectedSchool?.inep ?? ''} onChange={(event) => selectSchool(event.target.value)}>
            <option value="">Selecione uma escola</option>
            {schoolOptions.map((school) => (
              <option key={school.inep} value={school.inep}>
                {school.name} - {school.municipality}
              </option>
            ))}
          </select>
        </label>
      )
    }

    if (field.id === 'city') {
      return (
        <label key={field.id}>
          <span>{field.label}</span>
          <select value={draft.meta.city ?? ''} onChange={(event) => selectMunicipality(event.target.value)}>
            <option value="">Selecione o município</option>
            {municipalities.map((municipality) => (
              <option key={municipality} value={municipality}>
                {municipality}
              </option>
            ))}
          </select>
        </label>
      )
    }

    return (
      <label key={field.id}>
        <span>{field.label}</span>
        <input
          readOnly={field.id === 'gre'}
          type={field.type === 'date' ? 'date' : 'text'}
          value={draft.meta[field.id] ?? ''}
          placeholder={field.placeholder}
          onChange={(event) => updateMeta(field.id, event.target.value)}
        />
      </label>
    )
  }

  async function handleDocxReport() {
    setGeneratingReport(true)

    try {
      const { generateDocxReport } = await import('./reportGenerator')
      await generateDocxReport(draft)
    } finally {
      setGeneratingReport(false)
    }
  }

  async function handlePdfReport() {
    setGeneratingReport(true)

    try {
      const { generatePdfReport } = await import('./reportGenerator')
      generatePdfReport(draft)
    } finally {
      setGeneratingReport(false)
    }
  }

  function syncStatusLabel(status: InspectionDraft['syncStatus']) {
    if (status === 'pending') {
      return 'Pendente de envio'
    }

    if (status === 'synced') {
      return 'Sincronizada'
    }

    if (status === 'error') {
      return 'Erro no envio'
    }

    return 'Rascunho local'
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <span className="eyebrow">SEE/PE</span>
          <h1>Vistoria de Infraestrutura Escolar</h1>
        </div>
        <div className={online ? 'status online' : 'status offline'}>
          {online ? <Signal size={16} /> : <WifiOff size={16} />}
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      <section className="summaryBand">
        <div className="summaryCard primary">
          <ClipboardCheck size={22} />
          <div>
            <strong>{totals.percent}%</strong>
            <span>checklist preenchido</span>
          </div>
        </div>
        <div className="summaryCard">
          <Camera size={22} />
          <div>
            <strong>{totals.photos}</strong>
            <span>fotos anexadas</span>
          </div>
        </div>
        <div className="summaryCard">
          <Save size={22} />
          <div>
            <strong>{draft.syncStatus === 'pending' ? 'Pendente' : 'Auto'}</strong>
            <span>{syncStatusLabel(draft.syncStatus)}</span>
          </div>
        </div>
      </section>

      <section className="offlinePanel">
        <div className="offlineHeader">
          <div>
            <span className="eyebrow">Offline</span>
            <h2>Vistorias salvas neste aparelho</h2>
            <p>Você pode abrir, continuar e deixar vistorias pendentes para envio quando houver internet.</p>
          </div>
          <button className="primaryButton" disabled={!storageReady} type="button" onClick={createNewInspection}>
            <Plus size={18} />
            Nova vistoria
          </button>
        </div>
        <div className="inspectionList">
          {inspections.map((inspection) => (
            <button
              className={inspection.id === draft.id ? 'activeInspection' : ''}
              key={inspection.id}
              type="button"
              onClick={() => openInspection(inspection.id)}
            >
              <ListChecks size={18} />
              <span>
                <strong>{inspection.school}</strong>
                <small>
                  {inspection.city} • {syncStatusLabel(inspection.syncStatus)} •{' '}
                  {new Date(inspection.updatedAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </small>
              </span>
            </button>
          ))}
        </div>
        <div className="offlineActions">
          <button className="secondaryButton" type="button" onClick={markPendingSync}>
            <Save size={18} />
            Marcar pendente
          </button>
          <button className="secondaryButton dangerButton" type="button" onClick={removeCurrentInspection}>
            <Trash2 size={18} />
            Excluir vistoria
          </button>
        </div>
      </section>

      <section className="reportPanel">
        <div>
          <span className="eyebrow">Nota técnica</span>
          <h2>Gerar documento da vistoria</h2>
          <p>O arquivo usa os dados preenchidos, achados críticos e fotos anexadas por ambiente.</p>
        </div>
        <div className="reportActions">
          <button className="secondaryButton" disabled={generatingReport} type="button" onClick={handleDocxReport}>
            <FileDown size={18} />
            Gerar DOCX
          </button>
          <button className="primaryButton" disabled={generatingReport} type="button" onClick={handlePdfReport}>
            <FileText size={18} />
            Gerar PDF
          </button>
        </div>
      </section>

      <section className="identityPanel">
        <div className="sectionHeading">
          <Building2 size={20} />
          <h2>Identificacao da visita</h2>
        </div>
        <div className="identityGrid">
          {identificationFields.map((field) => renderMetaField(field))}
        </div>
        {selectedSchool && (
          <div className="schoolDetails">
            <span>INEP {selectedSchool.inep}</span>
            <span>{selectedSchool.gre}</span>
            {selectedSchool.address && <span>{selectedSchool.address}</span>}
          </div>
        )}
      </section>

      <nav className="sectionTabs" aria-label="Secoes do checklist">
        {sections.map((item, index) => {
          const complete = item.fields.filter((field) => {
            if (field.type === 'photos') {
              return (draft.photos[field.id] ?? []).length > 0
            }

            return isFilled(draft.answers[field.id])
          }).length

          return (
            <button
              className={index === activeSection ? 'active' : ''}
              key={item.id}
              type="button"
              onClick={() => setActiveSection(index)}
            >
              <span>{index + 1}</span>
              {item.title}
              <small>{complete}/{item.fields.length}</small>
            </button>
          )
        })}
      </nav>

      <section className="checklistPanel">
        <div className="sectionHeading">
          <FileText size={20} />
          <div>
            <h2>{section.title}</h2>
            {section.description && <p>{section.description}</p>}
          </div>
        </div>

        <div className="fields">
          {section.fields.map((field) => (
            <label className="field" key={field.id}>
              <span>
                {field.label}
                {field.required && <b>Obrigatorio</b>}
              </span>
              {field.helper && <small>{field.helper}</small>}
              {renderField(field)}
            </label>
          ))}
        </div>

        <div className="sectionActions">
          <button
            className="secondaryButton"
            disabled={activeSection === 0}
            type="button"
            onClick={() => setActiveSection((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft size={18} />
            Anterior
          </button>
          <button
            className="primaryButton"
            disabled={activeSection === sections.length - 1}
            type="button"
            onClick={() => setActiveSection((current) => Math.min(sections.length - 1, current + 1))}
          >
            Proxima
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      <footer>
        <span>
          Ultimo salvamento: {new Date(draft.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        <span>{storageReady ? 'Salvo em IndexedDB neste aparelho' : 'Carregando armazenamento offline...'}</span>
      </footer>
    </main>
  )
}

export default App
