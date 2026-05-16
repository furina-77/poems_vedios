import { useState, useEffect } from 'react'

interface Props {
  poemTitle: string
  poemLines: string[]
  scenes: string[]
  initialPrompts?: string[]
  onConfirm: (shotPrompts: string[]) => void
  onBack: () => void
}

export default function PromptEditor({ poemTitle, poemLines, scenes, initialPrompts, onConfirm, onBack }: Props) {
  const hasCache = initialPrompts && initialPrompts.length > 0
  const [loading, setLoading] = useState(!hasCache)
  const [error, setError] = useState<string | null>(null)
  const [shotPrompts, setShotPrompts] = useState<string[]>(initialPrompts || [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const charResult = await window.electronAPI.generateCharacter({ poemTitle, poemLines })
      if (!charResult.success || !charResult.data) {
        setError(charResult.error || '角色生成失败')
        setLoading(false)
        return
      }
      const promptResult = await window.electronAPI.generatePromptsFromScenes({
        character: charResult.data,
        scenes,
        poemTitle,
      })
      if (promptResult.success && promptResult.data) {
        setShotPrompts(promptResult.data)
      } else {
        setError(promptResult.error || '提示词生成失败')
      }
    } catch {
      setError('请求失败，请检查网络后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (!hasCache) generate() }, [])

  const startEdit = (i: number) => {
    setEditingIndex(i)
    setEditText(shotPrompts[i])
  }

  const saveEdit = () => {
    if (editingIndex !== null) {
      const updated = [...shotPrompts]
      updated[editingIndex] = editText
      setShotPrompts(updated)
    }
    setEditingIndex(null)
  }

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 48 }}>
        <div className="loading-spinner" />
        <p style={{ marginTop: 16, color: 'var(--color-text-secondary)' }}>
          正在为 {scenes.length} 组场景生成 {scenes.length} 镜提示词...
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
          <button className="btn btn-primary" onClick={generate}>重新生成</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="step-header">
        <h2>视频提示词（{shotPrompts.length} 镜）</h2>
        <p>AI 已按场景描述生成了 {shotPrompts.length} 组结构化提示词，角色形象全镜统一。点击可编辑，确认后进入视频生成</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shotPrompts.map((sp, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingIndex === i ? 12 : 0 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-primary)' }}>
                第 {i + 1}/{shotPrompts.length} 镜
              </h3>
              {editingIndex !== i && (
                <button className="btn btn-secondary" style={{ padding: '2px 12px', fontSize: 12 }} onClick={() => startEdit(i)}>
                  编辑
                </button>
              )}
            </div>

            {editingIndex === i ? (
              <div>
                <textarea
                  className="scene-textarea"
                  style={{ minHeight: 160, fontSize: 13 }}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setEditingIndex(null)}>
                    取消
                  </button>
                  <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={saveEdit}>
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--color-text)', lineHeight: 1.8, fontFamily: 'var(--font-family)' }}>
                {sp}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
        <button className="btn btn-secondary" onClick={onBack}>返回上一步</button>
        <button className="btn btn-secondary" onClick={generate}>重新生成</button>
        <button className="btn btn-primary" onClick={() => onConfirm(shotPrompts)}>
          确认，生成视频
        </button>
      </div>
    </div>
  )
}
