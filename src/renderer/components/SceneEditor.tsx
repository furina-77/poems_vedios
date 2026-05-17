import { useState, useEffect } from 'react'
import type { Poem } from '../../shared/types'

interface Props {
  poem: Poem
  initialScenes?: string[]
  onConfirm: (scenes: string[]) => void
  onBack: () => void
}

import { splitPoemLines } from '../../shared/utils'

export default function SceneEditor({ poem, initialScenes, onConfirm, onBack }: Props) {
  const lines = splitPoemLines(poem.content)
  const hasCache = initialScenes && initialScenes.length > 0
  const [scenes, setScenes] = useState<string[]>(initialScenes || lines.map(() => ''))
  const [loading, setLoading] = useState(!hasCache)
  const [error, setError] = useState<string | null>(null)

  const generateScenes = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.generateMultiScenes({
        title: poem.title,
        author: poem.author,
        content: poem.content,
      })
      if (result.success && result.data) {
        setScenes(result.data)
      } else {
        setError(result.error || '生成失败')
      }
    } catch {
      setError('请求失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (!hasCache) generateScenes() }, [])

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>
          正在为 {lines.length} 句诗词生成 {lines.length} 组场景描绘...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--color-error)', marginBottom: 16 }}>{error}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack}>返回上一步</button>
          <button className="btn btn-primary" onClick={generateScenes}>重新生成</button>
        </div>
      </div>
    )
  }

  const hasEmpty = scenes.some(s => !s.trim())

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, background: 'var(--color-bg)' }}>
        <span className="poem-type-badge" style={{ marginRight: 8 }}>
          {poem.type === 'jueju' ? '绝句' : poem.type === 'lvshi' ? '律诗' : '词'}
        </span>
        <span style={{ fontWeight: 600 }}>《{poem.title}》</span>
        <span style={{ color: 'var(--color-text-secondary)', marginLeft: 8 }}>{poem.author}</span>
      </div>

      <div className="step-header">
        <h2>AI 场景描绘（{scenes.length} 句）</h2>
        <p>AI 已按诗句拆分为 {scenes.length} 组视觉场景，每句对应一段场景描绘。你可以直接使用或修改后再提交</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {lines.map((line, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600,
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 6 }}>
                  诗句：{line}
                </p>
                <textarea
                  className="scene-textarea"
                  style={{ minHeight: 64, fontSize: 13 }}
                  rows={3}
                  value={scenes[i] || ''}
                  onChange={(e) => {
                    const updated = [...scenes]
                    updated[i] = e.target.value
                    setScenes(updated)
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>返回上一步</button>
        <button className="btn btn-secondary" onClick={generateScenes}>重新生成</button>
        <button
          className="btn btn-primary"
          disabled={hasEmpty}
          onClick={() => onConfirm(scenes.map(s => s.trim()))}
        >
          确认，生成提示词
        </button>
      </div>
    </div>
  )
}
