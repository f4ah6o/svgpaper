interface ToolbarProps {
  onSave: () => void
  onValidate: () => void
  onPreview: () => void
  hasTemplate: boolean
  isLoading: boolean
}

export function Toolbar({ onSave, onValidate, onPreview, hasTemplate, isLoading }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button 
        onClick={onSave} 
        disabled={!hasTemplate || isLoading}
        className="btn-primary"
      >
        {isLoading ? 'Saving...' : 'Save'}
      </button>
      <button 
        onClick={onValidate} 
        disabled={!hasTemplate || isLoading}
        className="btn-secondary"
      >
        Validate
      </button>
      <button 
        onClick={onPreview} 
        disabled={!hasTemplate || isLoading}
        className="btn-secondary"
      >
        Preview
      </button>
    </div>
  )
}
