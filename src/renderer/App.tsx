import { useState } from 'react'
import Layout from './components/Layout'
import CreatePage from './pages/CreatePage'
import LibraryPage from './pages/LibraryPage'

type PageKey = 'create' | 'library'

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageKey>('create')

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'create' ? <CreatePage /> : <LibraryPage />}
    </Layout>
  )
}
