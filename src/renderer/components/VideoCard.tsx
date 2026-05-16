import type { VideoRecord } from '../../preload/index'

interface Props {
  video: VideoRecord
  onPlay: (video: VideoRecord) => void
  onDelete: (video: VideoRecord) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.split(' ')[0] || dateStr.slice(0, 10)
}

export default function VideoCard({ video, onPlay, onDelete }: Props) {
  let promptFields: Record<string, string> = {}
  try {
    promptFields = JSON.parse(video.promptJson || '{}')
  } catch { /* ignore */ }

  return (
    <div className="video-card">
      {/* 缩略图区 */}
      <div className="video-card-thumb" onClick={() => onPlay(video)}>
        <div className="video-card-thumb-overlay">
          <span className="video-card-play-icon">▶</span>
        </div>
      </div>

      {/* 信息区 */}
      <div className="video-card-body">
        <h4 className="video-card-title">《{video.poemTitle}》</h4>
        <p className="video-card-author">{video.poemAuthor} · {video.fileName}</p>

        <div style={{ marginTop: 8 }}>
          {promptFields.subject && (
            <span className="video-card-tag">{promptFields.subject.slice(0, 20)}</span>
          )}
          {promptFields.scene && (
            <span className="video-card-tag">{promptFields.scene.slice(0, 20)}</span>
          )}
        </div>

        <div className="video-card-meta">
          <span>{formatSize(video.fileSize)}</span>
          <span>{formatDate(video.createdAt)}</span>
        </div>
      </div>

      {/* 操作 */}
      <div className="video-card-actions">
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => onPlay(video)}>
          播放
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '4px 12px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          onClick={() => onDelete(video)}
        >
          删除
        </button>
      </div>
    </div>
  )
}
