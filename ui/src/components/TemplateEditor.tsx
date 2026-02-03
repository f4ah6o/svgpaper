import { useState, useCallback } from 'preact/hooks'
import type { TemplateConfig, FieldBinding } from '../types/api'

interface TemplateEditorProps {
  template: TemplateConfig
  onChange: (template: TemplateConfig) => void
  onPageSelect: (pageId: string) => void
  selectedPageId: string | null
}

export function TemplateEditor({ template, onChange, onPageSelect, selectedPageId }: TemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'pages' | 'fields'>('info')

  const handleTemplateIdChange = useCallback((value: string) => {
    onChange({
      ...template,
      template: { ...template.template, id: value }
    })
  }, [template, onChange])

  const handleVersionChange = useCallback((value: string) => {
    onChange({
      ...template,
      template: { ...template.template, version: value }
    })
  }, [template, onChange])

  const handleFieldChange = useCallback((index: number, field: FieldBinding) => {
    const newFields = [...template.fields]
    newFields[index] = field
    onChange({ ...template, fields: newFields })
  }, [template, onChange])

  const handleAddField = useCallback(() => {
    const newField: FieldBinding = {
      svg_id: '',
      source: 'meta',
      key: '',
      fit: 'none',
      align: 'left'
    }
    onChange({ ...template, fields: [...template.fields, newField] })
  }, [template, onChange])

  const handleRemoveField = useCallback((index: number) => {
    const newFields = template.fields.filter((_, i) => i !== index)
    onChange({ ...template, fields: newFields })
  }, [template, onChange])

  return (
    <div className="template-editor">
      <div className="tabs">
        <button 
          className={activeTab === 'info' ? 'active' : ''} 
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button 
          className={activeTab === 'pages' ? 'active' : ''} 
          onClick={() => setActiveTab('pages')}
        >
          Pages ({template.pages.length})
        </button>
        <button 
          className={activeTab === 'fields' ? 'active' : ''} 
          onClick={() => setActiveTab('fields')}
        >
          Fields ({template.fields.length})
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="tab-content">
          <h3>Template Information</h3>
          <div className="form-group">
            <label>Template ID:</label>
            <input 
              type="text" 
              value={template.template.id}
              onChange={(e) => handleTemplateIdChange((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="form-group">
            <label>Version:</label>
            <input 
              type="text" 
              value={template.template.version}
              onChange={(e) => handleVersionChange((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="form-group">
            <label>Schema:</label>
            <input type="text" value={template.schema} disabled />
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="tab-content">
          <h3>Pages</h3>
          {template.pages.map((page) => (
            <div 
              key={page.id} 
              className={`page-item ${selectedPageId === page.id ? 'selected' : ''}`}
              onClick={() => onPageSelect(page.id)}
            >
              <div className="page-header">
                <span className="page-id">{page.id}</span>
                <span className="page-kind">{page.kind}</span>
              </div>
              <div className="page-svg">{page.svg}</div>
              <div className="page-tables">
                {page.tables.length} table(s)
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'fields' && (
        <div className="tab-content">
          <h3>Field Bindings</h3>
          <button className="btn-add" onClick={handleAddField}>+ Add Field</button>
          
          {template.fields.length === 0 ? (
            <p className="empty">No fields defined. Click "Add Field" to create one.</p>
          ) : (
            template.fields.map((field, index) => (
              <div key={index} className="field-item">
                <div className="field-header">
                  <span>Field #{index + 1}</span>
                  <button 
                    className="btn-remove"
                    onClick={() => handleRemoveField(index)}
                  >
                    Remove
                  </button>
                </div>
                <div className="field-form">
                  <div className="form-row">
                    <label>SVG ID:</label>
                    <input 
                      type="text"
                      value={field.svg_id}
                      onChange={(e) => handleFieldChange(index, { 
                        ...field, 
                        svg_id: (e.target as HTMLInputElement).value 
                      })}
                    />
                  </div>
                  <div className="form-row">
                    <label>Source:</label>
                    <select 
                      value={field.source}
                      onChange={(e) => handleFieldChange(index, { 
                        ...field, 
                        source: (e.target as HTMLSelectElement).value 
                      })}
                    >
                      <option value="meta">meta</option>
                      <option value="items">items</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <label>Key:</label>
                    <input 
                      type="text"
                      value={field.key}
                      onChange={(e) => handleFieldChange(index, { 
                        ...field, 
                        key: (e.target as HTMLInputElement).value 
                      })}
                    />
                  </div>
                  <div className="form-row">
                    <label>Align:</label>
                    <select 
                      value={field.align || 'left'}
                      onChange={(e) => handleFieldChange(index, { 
                        ...field, 
                        align: (e.target as HTMLSelectElement).value as 'left' | 'center' | 'right'
                      })}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
