import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { Mpa_pricingrequestsService } from './generated/services/Mpa_pricingrequestsService'
import type { Mpa_pricingrequests } from './generated/models/Mpa_pricingrequestsModel'
import { navIcons, navItems, type AppPage } from './navigation'
import CommandCenterPage from './pages/CommandCenterPage'
import IntakePage from './pages/IntakePage'
import MyWorkPage from './pages/MyWorkPage'
import PlaceholderPage from './pages/PlaceholderPage'
import PricingRecordsPage from './pages/PricingRecordsPage'

function App() {
  const [activePage, setActivePage] = useState<AppPage>('home')
  const [records, setRecords] = useState<Mpa_pricingrequests[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await Mpa_pricingrequestsService.getAll({
        top: 50,
        orderBy: ['createdon desc'],
      })

      if (!response.success) {
        throw response.error ?? new Error('Unable to load pricing requests.')
      }

      setRecords(response.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load records.'
      setErrorMessage(message)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords, activePage])

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return (
          <CommandCenterPage records={records} isLoading={isLoading} onNavigate={setActivePage} />
        )
      case 'my-work':
        return <MyWorkPage records={records} isLoading={isLoading} />
      case 'intake':
        return (
          <IntakePage
            onCreated={async () => setActivePage('pricing-records')}
            onBack={() => setActivePage('pricing-records')}
            setErrorMessage={setErrorMessage}
            setSuccessMessage={setSuccessMessage}
          />
        )
      case 'pricing-records':
        return (
          <PricingRecordsPage
            records={records}
            isLoading={isLoading}
            onRefresh={() => void loadRecords()}
            onCreateNew={() => setActivePage('intake')}
          />
        )
      case 'tech-assessment':
        return (
          <PlaceholderPage
            title="Technology assessment"
            description="Assess new and emerging technologies for pricing."
          />
        )
      case 'calculations':
        return (
          <PlaceholderPage
            title="Pricing calculations"
            description="Review comparator analysis and pricing calculations."
          />
        )
      case 'inquiries':
        return (
          <PlaceholderPage
            title="Inquiries & revisions"
            description="Capture and respond to pricing inquiries and revisions."
          />
        )
      case 'release-revisions':
        return (
          <PlaceholderPage
            title="Release revisions"
            description="Track release revisions and quarterly changes."
          />
        )
      case 'workflow-data':
        return (
          <PlaceholderPage
            title="Workflow & data"
            description="Configure workflow and review supporting data."
          />
        )
      case 'requirements':
        return (
          <PlaceholderPage
            title="Requirements"
            description="Review business and system requirements."
          />
        )
    }
  }


  return (
    <main className="app-shell">
      <header className="top-header">
        <h1>Medicare Pricing Automation</h1>
        <p>Central workspace for intake, pricing records, and operations.</p>
      </header>

      <div className="workspace-layout">
        <aside className="left-nav" aria-label="Application navigation">
          <div className="nav-brand">
            <span className="nav-logo">MP</span>
            <div>
              <strong>Medicare Pricing</strong>
              <span>Pricing Workspace</span>
            </div>
          </div>
          <nav>
            {navItems.map((item) => (
              <button
                key={item.key}
                className={activePage === item.key ? 'side-link active' : 'side-link'}
                type="button"
                onClick={() => {
                  setActivePage(item.key)
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={navIcons[item.key]} />
                </svg>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="nav-user">
            <span className="nav-avatar">MB</span>
            <div>
              <strong>Pricing Advisor</strong>
              <span>Policy and pricing</span>
            </div>
            <span className="nav-user-menu" aria-hidden="true">···</span>
          </div>
        </aside>

        <section className="content-pane">
          {errorMessage ? <p className="message error">{errorMessage}</p> : null}
          {successMessage ? <p className="message success">{successMessage}</p> : null}
          {renderActivePage()}
        </section>
      </div>
    </main>
  )
}

export default App
