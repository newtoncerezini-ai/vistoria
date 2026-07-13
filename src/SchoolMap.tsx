import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import type { School } from './schoolData'
import { schools } from './schoolData'

type SchoolStatus = {
  critical: boolean
  hasProject: boolean
  inspected: boolean
  criticalServices: string[]
  projectDetail: string
  inspectionLabel: string
}

type SchoolMapProps = {
  schoolStatuses: Record<string, SchoolStatus>
  selectedSchool?: School
  selectedMunicipality?: string
}

type MappedSchool = School & {
  lat: number
  lng: number
}

type PolygonGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

type BoundaryFeature = {
  geometry: PolygonGeometry
}

type BoundaryFeatureCollection = {
  features: BoundaryFeature[]
}

type CriticalFilter = 'all' | 'critical' | 'nonCritical'
type ProjectFilter = 'all' | 'withProject' | 'withoutProject'
type InspectionFilter = 'all' | 'inspected' | 'notInspected'

const CRITICAL_COLOR = '#dc2626'
const PROJECT_COLOR = '#16a34a'
const NO_PROJECT_COLOR = '#e2e8f0'
const INSPECTED_COLOR = '#2563eb'
const NOT_INSPECTED_COLOR = '#e2e8f0'
const EMPTY_STATUS: SchoolStatus = {
  critical: false,
  hasProject: false,
  inspected: false,
  criticalServices: [],
  projectDetail: '',
  inspectionLabel: '',
}

function parseCoordinate(value: string, kind: 'lat' | 'lng') {
  if (!value) return null

  const normalized = Number(value.replace(',', '.'))
  if (!Number.isFinite(normalized)) return null

  const min = kind === 'lat' ? -10 : -42
  const max = kind === 'lat' ? -7 : -34
  if (normalized >= min && normalized <= max) return normalized

  for (const divisor of [10, 100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000, 10_000_000_000]) {
    const candidate = normalized / divisor
    if (candidate >= min && candidate <= max) return candidate
  }

  return null
}

const mappedSchools: MappedSchool[] = schools
  .map((school) => {
    const lat = parseCoordinate(school.latitude, 'lat')
    const lng = parseCoordinate(school.longitude, 'lng')
    return lat === null || lng === null ? null : { ...school, lat, lng }
  })
  .filter((school): school is MappedSchool => school !== null)
const mappedSchoolIneps = new Set(mappedSchools.map((school) => school.inep))

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}


function formatYesNo(value: boolean) {
  return value ? 'Sim' : 'Nao'
}

function isPointInsideRing(lng: number, lat: number, ring: number[][]) {
  let inside = false
  let previousIndex = ring.length - 1

  for (let index = 0; index < ring.length; index += 1) {
    const [currentLng, currentLat] = ring[index]
    const [previousLng, previousLat] = ring[previousIndex]
    const intersects = currentLat > lat !== previousLat > lat
    const crossLng = ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat || Number.EPSILON) + currentLng

    if (intersects && lng < crossLng) inside = !inside
    previousIndex = index
  }

  return inside
}

function isPointInsidePolygon(lng: number, lat: number, polygon: number[][][]) {
  const [outerRing, ...holes] = polygon
  return isPointInsideRing(lng, lat, outerRing) && !holes.some((hole) => isPointInsideRing(lng, lat, hole))
}

function isPointInsideGeometry(lng: number, lat: number, geometry: PolygonGeometry) {
  if (geometry.type === 'Polygon') return isPointInsidePolygon(lng, lat, geometry.coordinates as number[][][])
  return (geometry.coordinates as number[][][][]).some((polygon) => isPointInsidePolygon(lng, lat, polygon))
}

function isPointInsideFeatureCollection(lng: number, lat: number, collection: BoundaryFeatureCollection) {
  return collection.features.some((feature) => isPointInsideGeometry(lng, lat, feature.geometry))
}

function splitMarkerIcon(status: SchoolStatus, selected: boolean) {
  const left = status.hasProject ? PROJECT_COLOR : NO_PROJECT_COLOR
  const right = status.inspected ? INSPECTED_COLOR : NOT_INSPECTED_COLOR
  const border = status.critical ? CRITICAL_COLOR : '#ffffff'
  const size = selected ? 22 : 16

  return L.divIcon({
    className: '',
    html: `<span class="splitSchoolMarker ${selected ? 'selected' : ''}" style="--left:${left};--right:${right};--marker-border:${border};--size:${size}px"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

export function SchoolMap({ schoolStatuses, selectedSchool, selectedMunicipality }: SchoolMapProps) {
  const [scope, setScope] = useState<'state' | 'municipality'>('state')
  const [criticalFilter, setCriticalFilter] = useState<CriticalFilter>('all')
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all')
  const [inspectionFilter, setInspectionFilter] = useState<InspectionFilter>('all')
  const [selectedGres, setSelectedGres] = useState<string[]>([])
  const [municipalityFilter, setMunicipalityFilter] = useState('')
  const [schoolNameFilter, setSchoolNameFilter] = useState('')
  const [focusedSchoolInep, setFocusedSchoolInep] = useState<string | null>(null)
  const [validIneps, setValidIneps] = useState<Set<string> | null>(null)
  const mapNode = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const municipalityLayerRef = useRef<L.GeoJSON | null>(null)

  const geographySchools = useMemo(() => {
    const schoolsInsidePe = validIneps ? mappedSchools.filter((school) => validIneps.has(school.inep)) : mappedSchools
    if (scope === 'municipality' && selectedMunicipality) {
      return schoolsInsidePe.filter((school) => school.municipality === selectedMunicipality)
    }
    return schoolsInsidePe
  }, [scope, selectedMunicipality, validIneps])

  const greOptions = useMemo(() => {
    return [...new Set(geographySchools.map((school) => school.gre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [geographySchools])

  const scopedSchools = useMemo(() => {
    if (selectedGres.length === 0) return geographySchools
    return geographySchools.filter((school) => selectedGres.includes(school.gre))
  }, [geographySchools, selectedGres])

  useEffect(() => {
    const availableGres = new Set(greOptions)
    setSelectedGres((current) => current.filter((gre) => availableGres.has(gre)))
  }, [greOptions])

  function toggleGre(gre: string) {
    setSelectedGres((current) => (current.includes(gre) ? current.filter((item) => item !== gre) : [...current, gre]))
  }

  const visibleSchools = useMemo(() => {
    return scopedSchools.filter((school) => {
      const status = schoolStatuses[school.inep] ?? EMPTY_STATUS
      const matchesCritical =
        criticalFilter === 'all' ||
        (criticalFilter === 'critical' && status.critical) ||
        (criticalFilter === 'nonCritical' && !status.critical)
      const matchesProject =
        projectFilter === 'all' ||
        (projectFilter === 'withProject' && status.hasProject) ||
        (projectFilter === 'withoutProject' && !status.hasProject)
      const matchesInspection =
        inspectionFilter === 'all' ||
        (inspectionFilter === 'inspected' && status.inspected) ||
        (inspectionFilter === 'notInspected' && !status.inspected)

      return matchesCritical && matchesProject && matchesInspection
    })
  }, [criticalFilter, inspectionFilter, projectFilter, schoolStatuses, scopedSchools])

  const tableSchools = useMemo(() => {
    return schools.filter((school) => {
      const status = schoolStatuses[school.inep] ?? EMPTY_STATUS
      const matchesGre = selectedGres.length === 0 || selectedGres.includes(school.gre)
      const matchesCritical =
        criticalFilter === 'all' ||
        (criticalFilter === 'critical' && status.critical) ||
        (criticalFilter === 'nonCritical' && !status.critical)
      const matchesProject =
        projectFilter === 'all' ||
        (projectFilter === 'withProject' && status.hasProject) ||
        (projectFilter === 'withoutProject' && !status.hasProject)
      const matchesInspection =
        inspectionFilter === 'all' ||
        (inspectionFilter === 'inspected' && status.inspected) ||
        (inspectionFilter === 'notInspected' && !status.inspected)

      return matchesGre && matchesCritical && matchesProject && matchesInspection
    })
  }, [criticalFilter, inspectionFilter, projectFilter, schoolStatuses, selectedGres])

  const tableTotals = useMemo(() => {
    const result = { total: tableSchools.length, critical: 0, nonCritical: 0, withProject: 0, withoutProject: 0, inspected: 0, notInspected: 0, criticalProjectInspected: 0 }
    for (const school of tableSchools) {
      const status = schoolStatuses[school.inep] ?? EMPTY_STATUS
      if (status.critical) result.critical += 1
      else result.nonCritical += 1
      if (status.hasProject) result.withProject += 1
      else result.withoutProject += 1
      if (status.inspected) result.inspected += 1
      else result.notInspected += 1
      if (status.critical && status.hasProject && status.inspected) result.criticalProjectInspected += 1
    }
    return result
  }, [schoolStatuses, tableSchools])

  const tableSchoolsWithoutCoordinates = useMemo(() => {
    return tableSchools.filter((school) => !mappedSchoolIneps.has(school.inep)).length
  }, [tableSchools])

  const scopedTotals = useMemo(() => {
    const result = { critical: 0, nonCritical: 0, withProject: 0, withoutProject: 0, inspected: 0, notInspected: 0 }
    for (const school of scopedSchools) {
      const status = schoolStatuses[school.inep]
      if (status?.critical) result.critical += 1
      else result.nonCritical += 1
      if (status?.hasProject) result.withProject += 1
      else result.withoutProject += 1
      if (status?.inspected) result.inspected += 1
      else result.notInspected += 1
    }
    return result
  }, [schoolStatuses, scopedSchools])

  const selectedMappedSchool = useMemo(() => {
    if (!selectedSchool) return null
    const mappedSchool = mappedSchools.find((school) => school.inep === selectedSchool.inep) ?? null
    if (mappedSchool && validIneps && !validIneps.has(mappedSchool.inep)) return null
    return mappedSchool
  }, [selectedSchool, validIneps])

  const totals = useMemo(() => {
    const result = { total: visibleSchools.length, critical: 0, nonCritical: 0, withProject: 0, withoutProject: 0, inspected: 0, notInspected: 0, criticalProjectInspected: 0 }
    for (const school of visibleSchools) {
      const status = schoolStatuses[school.inep]
      if (status?.critical) result.critical += 1
      else result.nonCritical += 1
      if (status?.hasProject) result.withProject += 1
      else result.withoutProject += 1
      if (status?.inspected) result.inspected += 1
      else result.notInspected += 1
      if (status?.critical && status?.hasProject && status?.inspected) result.criticalProjectInspected += 1
    }
    return result
  }, [schoolStatuses, visibleSchools])

  const exportSchools = useMemo(() => {
    const municipalityQuery = municipalityFilter.trim().toLocaleLowerCase('pt-BR')
    const schoolQuery = schoolNameFilter.trim().toLocaleLowerCase('pt-BR')
    return tableSchools
      .filter((school) => !municipalityQuery || school.municipality.toLocaleLowerCase('pt-BR').includes(municipalityQuery))
      .filter((school) => !schoolQuery || school.name.toLocaleLowerCase('pt-BR').includes(schoolQuery))
      .sort((first, second) => first.municipality.localeCompare(second.municipality, 'pt-BR') || first.name.localeCompare(second.name, 'pt-BR'))
  }, [municipalityFilter, schoolNameFilter, tableSchools])

  function exportFilteredSchools() {
    const headers = [
      'INEP',
      'Escola',
      'Municipio',
      'GRE',
      'Critica',
      'Com projeto',
      'Vistoriada',
      '3 status',
      'Servicos emergenciais',
      'Detalhamento do projeto',
      'Endereco',
      'Latitude',
      'Longitude',
      'Coordenada valida',
      'Plotada no mapa',
    ]
    const rows = exportSchools.map((school) => {
      const status = schoolStatuses[school.inep] ?? EMPTY_STATUS
      return [
        school.inep,
        school.name,
        school.municipality,
        school.gre,
        formatYesNo(status.critical),
        formatYesNo(status.hasProject),
        formatYesNo(status.inspected),
        formatYesNo(status.critical && status.hasProject && status.inspected),
        status.criticalServices.join('; '),
        status.projectDetail,
        school.address,
        school.latitude,
        school.longitude,
        formatYesNo(mappedSchoolIneps.has(school.inep)),
        formatYesNo(Boolean(validIneps?.has(school.inep))),
      ]
    })
    const body = [headers, ...rows]
      .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
      .join('')
    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${body}</table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `escolas-filtradas-${date}.xls`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function focusSchoolOnMap(school: School) {
    const mappedSchool = mappedSchools.find((item) => item.inep === school.inep)
    if (!mappedSchool || !mapRef.current) return
    setFocusedSchoolInep(school.inep)
    mapRef.current.setView([mappedSchool.lat, mappedSchool.lng], 14)
    mapNode.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const outsidePeCount = validIneps ? mappedSchools.length - validIneps.size : 0

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return

    const map = L.map(mapNode.current, {
      center: [-8.4, -37.8],
      zoom: 7,
      zoomControl: false,
      attributionControl: true,
    })

    map.createPane('municipality-boundaries')
    const municipalityPane = map.getPane('municipality-boundaries')
    if (municipalityPane) {
      municipalityPane.style.zIndex = '420'
      municipalityPane.style.pointerEvents = 'auto'
    }

    map.createPane('school-points')
    const schoolPane = map.getPane('school-points')
    if (schoolPane) schoolPane.style.zIndex = '650'

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)
    window.setTimeout(() => map.invalidateSize(), 100)

    fetch('/data/pe-municipios.geojson')
      .then((response) => response.json())
      .then((geojson: BoundaryFeatureCollection) => {
        if (!mapRef.current) return
        municipalityLayerRef.current = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
          style: {
            color: '#073763',
            dashArray: '6 3',
            fillColor: '#bfdbfe',
            fillOpacity: 0.02,
            opacity: 1,
            pane: 'municipality-boundaries',
            weight: 3,
          },
          onEachFeature: (feature, layer) => {
            const name = String(feature.properties?.nome ?? 'Município')
            layer.bindTooltip(`<strong>${escapeHtml(name)}</strong>`, { sticky: true, className: 'municipalityTooltip' })
          },
        }).addTo(mapRef.current)
        municipalityLayerRef.current.bringToBack()
        setValidIneps(new Set(mappedSchools.filter((school) => isPointInsideFeatureCollection(school.lng, school.lat, geojson)).map((school) => school.inep)))
      })

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const bounds = L.latLngBounds([])

    for (const school of visibleSchools) {
      const status = schoolStatuses[school.inep] ?? EMPTY_STATUS
      const isSelected = selectedMappedSchool?.inep === school.inep || focusedSchoolInep === school.inep
      const marker = L.marker([school.lat, school.lng], {
        icon: splitMarkerIcon(status, isSelected),
        pane: 'school-points',
      })
      const criticalLabel = status.critical ? 'Critica' : 'Nao critica'
      const projectLabel = status.hasProject ? 'Com projeto' : 'Sem projeto'
      const inspectionLabel = status.inspected ? 'Vistoriada' : 'Nao vistoriada'
      const services = status.criticalServices.length ? `<br /><strong>Servicos:</strong> ${escapeHtml(status.criticalServices.slice(0, 2).join('; '))}` : ''
      const project = status.projectDetail ? `<br /><strong>Projeto:</strong> ${escapeHtml(status.projectDetail)}` : ''
      const inspection = status.inspectionLabel ? `<br /><strong>Vistoria:</strong> ${escapeHtml(status.inspectionLabel)}` : ''

      marker.bindTooltip(`<strong>${escapeHtml(school.name)}</strong><br />${escapeHtml(school.municipality)}<br />${criticalLabel} - ${projectLabel} - ${inspectionLabel}`, { sticky: true })
      marker.bindPopup(
        `<strong>${escapeHtml(school.name)}</strong><br />${escapeHtml(school.municipality)}<br />${escapeHtml(school.gre)}<br />INEP ${escapeHtml(school.inep)}<br />${criticalLabel}<br />${projectLabel}<br />${inspectionLabel}${services}${project}${inspection}${school.address ? `<br />${escapeHtml(school.address)}` : ''}`,
      )
      marker.addTo(layer)
      bounds.extend([school.lat, school.lng])
    }

    municipalityLayerRef.current?.bringToBack()
    if (selectedMappedSchool && scope === 'municipality') {
      map.setView([selectedMappedSchool.lat, selectedMappedSchool.lng], 14)
      return
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: scope === 'municipality' ? 11 : 8 })
  }, [focusedSchoolInep, schoolStatuses, scope, selectedMappedSchool, visibleSchools])

  return (
    <div className="mapPanel">
      <div className="mapHeader">
        <div>
          <span className="eyebrow">Mapa situacional</span>
          <h2>Criticidade, projetos e vistorias</h2>
          <p>
            {totals.total} escolas plotadas. {totals.critical} criticas, {totals.withProject} com projeto, {totals.inspected} vistoriadas e {totals.criticalProjectInspected} com os tres status.
            {outsidePeCount > 0 ? ` ${outsidePeCount} com coordenadas fora dos limites de PE foram ocultadas.` : ''}
          </p>
        </div>
        <div className="mapScopeControl" aria-label="Escopo do mapa">
          <button className={scope === 'state' ? 'active' : ''} type="button" onClick={() => setScope('state')}>Pernambuco</button>
          {selectedMunicipality && (
            <button className={scope === 'municipality' ? 'active' : ''} type="button" onClick={() => setScope('municipality')}>Município atual</button>
          )}
        </div>
      </div>

      <div className="mapFilters" aria-label="Filtros do mapa">
        <fieldset className="greFilter">
          <legend>GRE</legend>
          <div className="greMultiSelect">
            <button className={selectedGres.length === 0 ? 'active' : ''} type="button" onClick={() => setSelectedGres([])}>
              Todas as GREs
            </button>
            {greOptions.map((gre) => (
              <button className={selectedGres.includes(gre) ? 'active' : ''} key={gre} type="button" onClick={() => toggleGre(gre)}>
                {gre}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Criticidade</legend>
          <div>
            <button className={criticalFilter === 'all' ? 'active' : ''} type="button" onClick={() => setCriticalFilter('all')}>
              Todas
            </button>
            <button className={criticalFilter === 'critical' ? 'active' : ''} type="button" onClick={() => setCriticalFilter('critical')}>
              Críticas <span>{scopedTotals.critical}</span>
            </button>
            <button className={criticalFilter === 'nonCritical' ? 'active' : ''} type="button" onClick={() => setCriticalFilter('nonCritical')}>
              Não críticas <span>{scopedTotals.nonCritical}</span>
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Projetos</legend>
          <div>
            <button className={projectFilter === 'all' ? 'active' : ''} type="button" onClick={() => setProjectFilter('all')}>
              Todos
            </button>
            <button className={projectFilter === 'withProject' ? 'active' : ''} type="button" onClick={() => setProjectFilter('withProject')}>
              Com projeto <span>{scopedTotals.withProject}</span>
            </button>
            <button className={projectFilter === 'withoutProject' ? 'active' : ''} type="button" onClick={() => setProjectFilter('withoutProject')}>
              Sem projeto <span>{scopedTotals.withoutProject}</span>
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Vistoria</legend>
          <div>
            <button className={inspectionFilter === 'all' ? 'active' : ''} type="button" onClick={() => setInspectionFilter('all')}>
              Todas
            </button>
            <button className={inspectionFilter === 'inspected' ? 'active' : ''} type="button" onClick={() => setInspectionFilter('inspected')}>
              Vistoriadas <span>{scopedTotals.inspected}</span>
            </button>
            <button className={inspectionFilter === 'notInspected' ? 'active' : ''} type="button" onClick={() => setInspectionFilter('notInspected')}>
              Nao vistoriadas <span>{scopedTotals.notInspected}</span>
            </button>
          </div>
        </fieldset>
      </div>

      <div className="mapStats">
        <span><strong>{tableTotals.critical}</strong> críticas</span>
        <span><strong>{tableTotals.nonCritical}</strong> não críticas</span>
        <span><strong>{tableTotals.withProject}</strong> com projeto</span>
        <span><strong>{tableTotals.withoutProject}</strong> sem projeto</span>
        <span><strong>{tableTotals.inspected}</strong> vistoriadas</span>
        <span><strong>{tableTotals.notInspected}</strong> nao vistoriadas</span>
      </div>

      {tableSchoolsWithoutCoordinates > 0 && (
        <div className="coordinateNotice">
          <strong>{tableSchoolsWithoutCoordinates}</strong> escolas deste recorte estao sem coordenadas validas e nao aparecem no mapa.
        </div>
      )}

      <div className="mapFrame">
        <aside className="mapFloatingLegend">
          <strong>Legenda</strong>
          <div className="legendItems">
            <div><span className="legendMunicipality" /><p>Limite municipal</p></div>
            <div><span className="legendCriticalBorder" /><p>Borda vermelha: critica</p></div>
            <div><span className="legendHalf leftProject" /><p>Metade esquerda: com projeto</p></div>
            <div><span className="legendHalf leftNoProject" /><p>Metade esquerda: sem projeto</p></div>
            <div><span className="legendHalf rightInspected" /><p>Metade direita: vistoriada</p></div>
            <div><span className="legendHalf rightNotInspected" /><p>Metade direita: nao vistoriada</p></div>
            <div><span className="splitLegendMarker" /><p>Exemplo: critica, com projeto e vistoriada</p></div>
          </div>
        </aside>
        <div className="mapCanvas" ref={mapNode} role="img" aria-label="Mapa com escolas criticas, projetos e vistorias" />
      </div>

      <section className="municipalitySummary">
        <div className="municipalitySummaryHeader">
          <div>
            <span className="eyebrow">Lista de escolas da base</span>
            <h3>Escolas filtradas</h3>
            <p>
              {tableTotals.total} escolas na base. {tableTotals.critical} criticas, {tableTotals.withProject} com projeto, {tableTotals.inspected} vistoriadas e {tableTotals.criticalProjectInspected} com os tres status.
            </p>
          </div>
          <label className="municipalitySearch">
            <span>Filtrar município</span>
            <input value={municipalityFilter} onChange={(event) => setMunicipalityFilter(event.target.value)} placeholder="Digite o município" type="search" />
          </label>
          <label className="municipalitySearch">
            <span>Filtrar escola</span>
            <input value={schoolNameFilter} onChange={(event) => setSchoolNameFilter(event.target.value)} placeholder="Digite o nome da escola" type="search" />
          </label>
          <button className="exportButton" disabled={exportSchools.length === 0} type="button" onClick={exportFilteredSchools}>
            Exportar XLS <span>{exportSchools.length}</span>
          </button>
          <strong>{exportSchools.length}</strong>
        </div>
        <div className="municipalityTableWrap">
          <table>
            <thead>
              <tr>
                <th>Município</th>
                <th>Escola</th>
                <th>INEP</th>
                <th>Crítica</th>
                <th>Com projeto</th>
                <th>Vistoriada</th>
                <th>3 status</th>
              </tr>
            </thead>
            <tbody>
              {exportSchools.map((school) => {
                const status = schoolStatuses[school.inep] ?? EMPTY_STATUS
                const canFocusMap = mappedSchoolIneps.has(school.inep)
                return (
                  <tr className={canFocusMap ? 'clickableSchoolRow' : ''} key={school.inep} onClick={() => focusSchoolOnMap(school)}>
                    <td>{school.municipality}</td>
                    <td>{school.name}</td>
                    <td>{school.inep}</td>
                    <td>{formatYesNo(status.critical)}</td>
                    <td>{formatYesNo(status.hasProject)}</td>
                    <td>{formatYesNo(status.inspected)}</td>
                    <td>{formatYesNo(status.critical && status.hasProject && status.inspected)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
