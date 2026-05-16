const STEPS = [
  { key: 1, label: '选题材' },
  { key: 2, label: '场景描绘' },
  { key: 3, label: '提示词' },
  { key: 4, label: '生成视频' },
  { key: 5, label: '完成' },
]

interface Props {
  currentStep: number
}

export default function StepperBar({ currentStep }: Props) {
  return (
    <div className="stepper">
      {STEPS.map((step, index) => (
        <div key={step.key} className="stepper-item">
          <div className={`stepper-node ${step.key <= currentStep ? 'stepper-node--active' : ''} ${step.key < currentStep ? 'stepper-node--done' : ''}`}>
            {step.key < currentStep ? '✓' : step.key}
          </div>
          <span className={`stepper-label ${step.key <= currentStep ? 'stepper-label--active' : ''}`}>
            {step.label}
          </span>
          {index < STEPS.length - 1 && (
            <div className={`stepper-line ${step.key < currentStep ? 'stepper-line--done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  )
}
