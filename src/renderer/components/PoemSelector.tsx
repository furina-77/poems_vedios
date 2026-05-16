import { useState, useEffect } from 'react'
import type { Poem } from '../../shared/types'

interface Props {
  onConfirm: (poem: Poem) => void
}

export default function PoemSelector({ onConfirm }: Props) {
  const [poems, setPoems] = useState<Poem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPoems = async () => {
    setLoading(true)
    setError(null)
    setSelectedId(null)
    try {
      const result = await window.electronAPI.fetchPoems(4)
      if (result.success && result.data) {
        setPoems(result.data)
      } else {
        setError(result.error || '获取诗词失败')
      }
    } catch {
      setError('网络或系统错误')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPoems()
  }, [])

  const handleConfirm = async () => {
    if (!selectedId) return
    const poem = poems.find(p => p.id === selectedId)
    if (!poem) return

    onConfirm(poem)
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'jueju': return '绝句'
      case 'lvshi': return '律诗'
      case 'ci': return '词'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>正在为你挑选诗词...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--color-error)', marginBottom: 16 }}>{error}</p>
        <button className="btn btn-secondary" onClick={fetchPoems}>重试</button>
      </div>
    )
  }

  return (
    <div>
      <div className="poem-grid">
        {poems.map((poem) => (
          <div
            key={poem.id}
            className={`poem-card ${selectedId === poem.id ? 'poem-card--selected' : ''}`}
            onClick={() => setSelectedId(poem.id)}
          >
            <div className="poem-card-header">
              <span className="poem-type-badge">{typeLabel(poem.type)}</span>
              <span className="poem-dynasty">{poem.dynasty}</span>
            </div>
            <h3 className="poem-title">{poem.title}</h3>
            <p className="poem-author">{poem.author}</p>
            <div className="poem-content">
              {poem.content.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="poem-actions">
        <button className="btn btn-secondary" onClick={fetchPoems} disabled={loading}>
          换一批
        </button>
        <button
          className="btn btn-primary"
          disabled={!selectedId}
          onClick={handleConfirm}
        >
          确认选择
        </button>
      </div>
    </div>
  )
}
