import Generator from './components/Generator'

export default function App() {
  return <div className="workspace" id="top">
    <aside className="sidebar" aria-label="Signature workspace">
      <a className="brand" href="#top"><span className="brand-mark">S</span><span>SigFree<small>Signature workspace</small></span></a>
      <div className="sidebar-label">Workspace</div>
      <nav className="nav-links">
        <a href="#generator-section"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>Edit signature</a>
        <a href="#export"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4zM13 7a3 3 0 0 1 3-3h4v14h-3a4 4 0 0 0-4 3"/></svg>Mail setup</a>
      </nav>
      <div className="sidebar-foot"><span className="local-dot"/>Local workspace<small>Profiles stay in this browser</small></div>
    </aside>
    <main className="workspace-main">
      <header className="workspace-bar"><span>Workspace <span className="breadcrumb-separator">/</span> <strong>Email signature</strong></span><span className="workspace-badge">SigFree</span></header>
      <section className="section" id="generator-section">
        <div className="section-heading"><div><p className="eyebrow">Your correspondence</p><h1>Email signature</h1><p className="section-sub">One design for Gmail, Outlook, Apple Mail and your phone.</p></div><a className="setup-link" href="#export">Mail setup <span aria-hidden="true">↓</span></a></div>
        <Generator />
      </section>
      <footer className="workspace-footer"><span>SigFree</span><span>Your signature, wherever you send.</span></footer>
    </main>
  </div>
}
