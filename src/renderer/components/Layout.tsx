import type { ReactNode } from 'react'

type PageKey = 'create' | 'library'

interface Props {
  currentPage: PageKey
  onNavigate: (page: PageKey) => void
  children: ReactNode
}

const NAV_ITEMS: { key: PageKey; label: string }[] = [
  { key: 'create', label: '新建创作' },
  { key: 'library', label: '视频库' },
]

export default function Layout({ currentPage, onNavigate, children }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">古诗词视频工坊</h1>
        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-btn ${currentPage === item.key ? 'nav-btn--active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="app-body">
        <main className="app-main">{children}</main>
      </div>

      <footer className="app-footer">
        <span>古诗词视频工坊 v1.0.0</span>
      </footer>
    </div>
  )
}
