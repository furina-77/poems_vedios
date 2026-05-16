import { useState } from 'react'
import StepperBar from '../components/StepperBar'
import PoemSelector from '../components/PoemSelector'
import SceneEditor from '../components/SceneEditor'
import PromptEditor from '../components/PromptEditor'
import VideoPreview from '../components/VideoPreview'
import type { Poem } from '../../shared/types'

type Step = 1 | 2 | 3 | 4 | 5

function splitPoemLines(content: string): string[] {
  return content
    .split(/\n+/)
    .map(s => s.replace(/[，。、；：？！""''（）《》\s]/g, '').trim())
    .filter(s => s.length >= 4)
}

export default function CreatePage() {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null)
  const [scenes, setScenes] = useState<string[]>([])
  const [shotPrompts, setShotPrompts] = useState<string[]>([])
  const [savedName, setSavedName] = useState('')
  const [saving, setSaving] = useState(false)

  // Step 1 → 2: 选题材
  const handlePoemConfirm = (poem: Poem) => {
    setSelectedPoem(poem)
    setCurrentStep(2)
  }

  // Step 2 → 3: 场景描绘完成
  const handleSceneConfirm = (s: string[]) => {
    setScenes(s)
    setCurrentStep(3)
  }

  // Step 3 → 4: 提示词确认
  const handlePromptConfirm = (shots: string[]) => {
    setShotPrompts(shots)
    setCurrentStep(4)
  }

  // Step 4 → 5: 保存视频
  const handleSave = async (tempPath: string) => {
    if (!tempPath || /^https?:\/\//i.test(tempPath)) {
      alert('视频文件未就绪，无法保存')
      return
    }
    if (!selectedPoem) return

    const promptRecord: Record<string, string> = {
      subject: '', details: '', action: '', scene: '',
      camera: '', lighting: '', atmosphere: '', quality: '',
    }
    const patterns: Record<string, string> = {
      '【主体】': 'subject', '【细节】': 'details', '【动作】': 'action',
      '【场景】': 'scene', '【镜头】': 'camera', '【光影】': 'lighting',
      '【氛围】': 'atmosphere', '【画质】': 'quality',
    }
    const firstShot = shotPrompts[0] || ''
    for (const [tag, key] of Object.entries(patterns)) {
      const m = firstShot.match(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^\\n]*)'))
      if (m) promptRecord[key] = m[1].trim()
    }

    setSaving(true)
    try {
      const result = await window.electronAPI.saveVideo({
        tempPath,
        poem: { id: selectedPoem.id, title: selectedPoem.title, author: selectedPoem.author, content: selectedPoem.content },
        scene: scenes.join('\n---\n'),
        prompt: promptRecord,
      })
      if (result.success && result.data) {
        setSavedName(result.data.fileName)
        setCurrentStep(5)
      } else {
        alert(result.error || '保存失败')
      }
    } catch {
      alert('保存操作失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setShotPrompts([])
    setCurrentStep(3)
  }

  const handleStartNew = () => {
    setCurrentStep(1)
    setSelectedPoem(null)
    setScenes([])
    setShotPrompts([])
    setSavedName('')
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <StepperBar currentStep={currentStep} />

      {/* 步骤1: 选题材 */}
      {currentStep === 1 && (
        <section>
          <div className="step-header">
            <h2>选择创作题材</h2>
            <p>请从以下诗词中选一首作为视频创作的主题</p>
          </div>
          <PoemSelector onConfirm={handlePoemConfirm} />
        </section>
      )}

      {/* 步骤2: AI场景描绘（逐句） */}
      {currentStep === 2 && selectedPoem && (
        <SceneEditor
          poem={selectedPoem}
          initialScenes={scenes.length > 0 ? scenes : undefined}
          onConfirm={handleSceneConfirm}
          onBack={() => { setScenes([]); setCurrentStep(1) }}
        />
      )}

      {/* 步骤3: 提示词生成（基于场景） */}
      {currentStep === 3 && selectedPoem && scenes.length > 0 && (
        <PromptEditor
          poemTitle={selectedPoem.title}
          poemLines={splitPoemLines(selectedPoem.content)}
          scenes={scenes}
          initialPrompts={shotPrompts.length > 0 ? shotPrompts : undefined}
          onConfirm={handlePromptConfirm}
          onBack={() => { setShotPrompts([]); setCurrentStep(2) }}
        />
      )}

      {/* 步骤4: 视频生成 */}
      {currentStep === 4 && shotPrompts.length > 0 && (
        <VideoPreview
          shotPrompts={shotPrompts}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onBack={() => setCurrentStep(3)}
        />
      )}

      {/* 步骤5: 完成 */}
      {currentStep === 5 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: 'var(--color-success)', marginBottom: 8 }}>创作完成！</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            视频已保存{ savedName && `（${savedName}）`}，可在「视频库」中查看
          </p>
          {selectedPoem && (
            <div className="card" style={{ background: 'var(--color-bg)', marginBottom: 24, textAlign: 'left' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
                题材：《{selectedPoem.title}》— {selectedPoem.author}
              </p>
            </div>
          )}
          {saving && (
            <div style={{ marginBottom: 16 }}>
              <div className="loading-spinner" style={{ width: 24, height: 24 }} />
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>正在保存...</p>
            </div>
          )}
          <button className="btn btn-primary" onClick={handleStartNew} disabled={saving}>
            重新创作
          </button>
        </div>
      )}
    </div>
  )
}
