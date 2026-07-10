import { useMemo } from 'react'
import { MapPinned, Signal, WifiOff } from 'lucide-react'
import './App.css'
import { SchoolMap } from './SchoolMap'
import { schools } from './schoolData'
import { criticalSchoolIneps, projectSchoolIneps, schoolCriticalServices, schoolProjectDetails } from './schoolStatusData'

const criticalServicesByInep = schoolCriticalServices as Record<string, string[]>
const projectDetailsByInep = schoolProjectDetails as Record<string, string>

function App() {
  const online = navigator.onLine
  const schoolStatuses = useMemo(() => {
    return Object.fromEntries(
      schools.map((school) => [
        school.inep,
        {
          critical: criticalSchoolIneps.has(school.inep),
          hasProject: projectSchoolIneps.has(school.inep),
          criticalServices: criticalServicesByInep[school.inep] ?? [],
          projectDetail: projectDetailsByInep[school.inep] ?? '',
        },
      ]),
    )
  }, [])

  return (
    <main className="mapOnlyApp">
      <header className="mapOnlyHeader">
        <div>
          <span className="eyebrow">SEE/PE</span>
          <h1>Mapa Situacional das Escolas</h1>
          <p>Visualização georreferenciada da base escolar com status de visita e estado da unidade.</p>
        </div>
        <div className={online ? 'status online' : 'status offline'}>
          {online ? <Signal size={16} /> : <WifiOff size={16} />}
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      <section className="mapOnlySummary">
        <div>
          <MapPinned size={22} />
          <span>
            <strong>{schools.length}</strong>
            escolas na base
          </span>
        </div>
        <div>
          <strong>904</strong>
          escolas com coordenadas válidas
        </div>
        <div>
          <strong>2 informações</strong>
          criticidade e projeto no mesmo marcador
        </div>
      </section>

      <SchoolMap schoolStatuses={schoolStatuses} />
    </main>
  )
}

export default App
