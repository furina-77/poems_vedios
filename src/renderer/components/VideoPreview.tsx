import { useState, useEffect, useRef, useCallback } from 'react'
import type { GenerationProgress } from '../../shared/types'

interface Props {
  shotPrompts: string[]
  onSave: (filePath: string) => void
  onDiscard: () => void
  onBack: () => void
}

export default function VideoPreview({ shotPrompts, onSave, onDiscard, onBack }: Props) {
  const [overallStatus, setOverallStatus] = useState<'generating' | 'completed' | 'failed'>('generating')
  const [currentClip, setCurrentClip] = useState(0)
  const [totalClips] = useState(shotPrompts.length)
  const [error, setError] = useState<string | null>(null)
  const [filePath, setFilePath] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const elapsedTimer = useRef<ReturnType<typeof setInterval>>()
  const elapsedRef = useRef(0)
  const mountedRef = useRef(true)
  const generatingRef = useRef(false)

  const stopTimer = () => {
    if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = undefined }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    return m > 0 ? `${m} 分 ${s % 60} 秒` : `${s} 秒`
  }

  const handleCancel = async () => {
    await window.electronAPI.cancelGeneration()
    generatingRef.current = false
    stopTimer()
    setOverallStatus('failed')
    setError('已取消生成')
  }

  const handleProgress = useCallback((p: GenerationProgress) => {
    if (!mountedRef.current) return
    if (p.status === 'clip_done' || p.status === 'generating') {
      setCurrentClip(p.currentClip)
    }
    if (p.status === 'done') {
      setFilePath(p.clipPath || null)
      setOverallStatus('completed')
      stopTimer()
    }
  }, [])

  const startGeneration = async () => {
    if (generatingRef.current) return
    generatingRef.current = true
    setOverallStatus('generating')
    setError(null)
    setFilePath(null)
    setCurrentClip(0)
    elapsedRef.current = 0
    setElapsed(0)

    // 计时器
    elapsedTimer.current = setInterval(() => {
      elapsedRef.current += 1
      if (mountedRef.current) setElapsed(elapsedRef.current)
    }, 1000)

    try {
      const result = await window.electronAPI.generateLongVideo(shotPrompts)

      stopTimer()
      if (!mountedRef.current) return

      if (result.success && result.data) {
        setFilePath(result.data.filePath)
        setOverallStatus('completed')
      } else {
        setError(result.error || '生成失败')
        setOverallStatus('failed')
      }
    } catch (e: any) {
      stopTimer()
      if (!mountedRef.current) return
      setError(String(e?.message ?? e))
      setOverallStatus('failed')
    } finally {
      generatingRef.current = false
    }
  }

  useEffect(() => {
    mountedRef.current = true
    const unsub = window.electronAPI.onGenerationProgress(handleProgress)
    startGeneration()
    return () => {
      mountedRef.current = false
      stopTimer()
      unsub()
    }
  }, [])

  const progressPct = totalClips > 0 ? Math.round((currentClip / totalClips) * 100) : 0

  return (
    <div className="card">
      <div className="step-header">
        <h2>视频生成</h2>
        <p>{shotPrompts.length} 镜按诗句拆分 · 角色统一 · 拼接输出约 {shotPrompts.length * 10} 秒</p>
      </div>

      <div style={{ padding: '24px 0' }}>
        {overallStatus === 'failed' && (
          <div style={{ textAlign: 'center' }}>
            <div className="gen-icon gen-icon--fail">!</div>
            <p style={{ color: 'var(--color-error)', marginBottom: 16 }}>{error}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={onBack}>返回修改</button>
              <button className="btn btn-primary" onClick={startGeneration}>重试</button>
            </div>
          </div>
        )}

        {overallStatus === 'completed' && filePath && (
          <div style={{ textAlign: 'center' }}>
            <div className="gen-icon gen-icon--ok">✓</div>
            <p style={{ color: 'var(--color-success)', marginBottom: 6, fontWeight: 600, fontSize: 16 }}>生成完毕</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, marginBottom: 8 }}>
              耗时 {formatTime(elapsed)} · {shotPrompts.length} 镜拼接约 {shotPrompts.length * 10} 秒
            </p>

            <div style={{ marginBottom: 24 }}>
              <video controls autoPlay
                style={{ width: '100%', maxWidth: 600, borderRadius: 8, background: '#000' }}
                src={`local-video://file/${encodeURIComponent(filePath)}`}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={onDiscard}>放弃</button>
              <button className="btn btn-primary" onClick={() => onSave(filePath)}>保存视频</button>
            </div>
          </div>
        )}

        {overallStatus === 'generating' && (
          <div style={{ textAlign: 'center' }}>
            <div className="gen-animation">
              <div className="gen-animation-ring" />
              <div className="gen-animation-inner">🎬</div>
            </div>

            <p style={{ fontWeight: 600, marginBottom: 4, marginTop: 8 }}>
              正在生成第 {currentClip}/{totalClips} 镜...
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 16, fontWeight: 500 }}>
              每镜 10 秒 · 共 {totalClips * 10} 秒
            </p>

            <div className="gen-progress-track">
              <div className="gen-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>

            <div className="gen-time-row">
              <div className="gen-time-item">
                <span className="gen-time-label">进度</span>
                <span className="gen-time-value">{progressPct}%</span>
              </div>
              <div className="gen-time-divider" />
              <div className="gen-time-item">
                <span className="gen-time-label">已用时</span>
                <span className="gen-time-value">{formatTime(elapsed)}</span>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                className="btn btn-secondary"
                style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', padding: '6px 24px' }}
                onClick={handleCancel}
              >
                停止生成
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
