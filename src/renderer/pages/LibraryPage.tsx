import { useState, useEffect, useCallback } from 'react'
import VideoCard from '../components/VideoCard'
import type { VideoRecord } from '../../preload/index'

export default function LibraryPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [playing, setPlaying] = useState<VideoRecord | null>(null)

  const loadVideos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = keyword
        ? await window.electronAPI.searchVideos(keyword)
        : await window.electronAPI.getAllVideos()

      if (result.success && result.data) {
        setVideos(result.data)
      } else {
        setError(result.error || '加载失败')
      }
    } catch {
      setError('加载视频列表失败')
    } finally {
      setLoading(false)
    }
  }, [keyword])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  const handleDelete = async (video: VideoRecord) => {
    if (!confirm(`确定要删除《${video.poemTitle}》的视频吗？此操作不可恢复。`)) return

    try {
      const result = await window.electronAPI.deleteVideo(video.id)
      if (result.success) {
        setVideos(prev => prev.filter(v => v.id !== video.id))
        if (playing?.id === video.id) setPlaying(null)
      } else {
        alert(result.error || '删除失败')
      }
    } catch {
      alert('删除操作失败')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadVideos()
  }

  const [rescanning, setRescanning] = useState(false)

  const handleRescan = async () => {
    setRescanning(true)
    try {
      const result = await window.electronAPI.rescanFolder()
      if (result.success && result.data) {
        alert(`扫描完成：文件夹共 ${result.data.total} 个文件，新增 ${result.data.added} 条记录`)
        loadVideos()
      } else {
        alert('扫描失败：' + (result.error || '未知错误'))
      }
    } catch {
      alert('扫描操作失败')
    } finally {
      setRescanning(false)
    }
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ font: 'var(--font-h2)' }}>视频库</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={handleRescan}
            disabled={rescanning}
          >
            {rescanning ? '扫描中...' : '重新扫描'}
          </button>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            className="prompt-field-input"
            style={{ width: 200, padding: '6px 12px' }}
            placeholder="搜索诗词名/作者..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" style={{ padding: '6px 16px', fontSize: 13 }}>
            搜索
          </button>
          {keyword && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: 13 }}
              onClick={() => setKeyword('')}
            >
              清除
            </button>
          )}
        </form>
        </div>
      </div>

      {/* 播放器弹窗 */}
      {playing && (
        <div className="player-overlay" onClick={() => setPlaying(null)}>
          <div className="player-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ font: 'var(--font-h3)' }}>《{playing.poemTitle}》— {playing.poemAuthor}</h3>
              <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setPlaying(null)}>
                关闭
              </button>
            </div>
            <video
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '70vh', borderRadius: 8, background: '#000' }}
              src={`local-video://file/${encodeURIComponent(playing.filePath)}`}
            />
          </div>
        </div>
      )}

      {/* 内容 */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div className="loading-spinner" />
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--color-error)', marginBottom: 16 }}>{error}</p>
          <button className="btn btn-primary" onClick={loadVideos}>重试</button>
        </div>
      ) : videos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            {keyword ? '没有找到匹配的视频' : '视频库为空'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {keyword ? '试试其他关键词' : '去「新建创作」生成你的第一个视频吧'}
          </p>
        </div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={setPlaying}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
