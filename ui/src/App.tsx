import { useState, useCallback, useEffect } from 'preact/hooks'
import type { TemplateConfig, TextElement, ValidationResponse, PreviewResponse } from './types/api'
import { rpc } from './lib/rpc'
import { Toolbar } from './components/Toolbar'
import { TemplateEditor } from './components/TemplateEditor'
import { SvgViewer } from './components/SvgViewer'
import { StatusBar } from './components/StatusBar'
import './App.css'

export function App() {
  const [templateDir, setTemplateDir] = useState('test-templates/delivery-slip/v1')
  const [template, setTemplate] = useState<TemplateConfig | null>(null)
  const [selectedSvg, setSelectedSvg] = useState<string | null>(null)
  const [svgElements, setSvgElements] = useState<TextElement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string>('Ready')
  const [error, setError] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResponse | null>(null)
  const [previewResult, setPreviewResult] = useState<PreviewResponse | null>(null)

  // Check connection on mount
  useEffect(() => {
    rpc.getVersion()
      .then(() => setStatus('Connected to RPC server'))
      .catch(() => setStatus('Error: Cannot connect to RPC server'))
  }, [])

  const handleLoad = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setStatus('Loading template...')
    
    try {
      const templateJson = await rpc.loadTemplate(templateDir)
      setTemplate(templateJson)
      setSelectedSvg(templateJson.pages[0]?.svg || null)
      setStatus(`Loaded template: ${templateJson.template.id} v${templateJson.template.version}`)
      
      // Load SVG elements
      if (templateJson.pages[0]) {
        const svgPath = `${templateDir}/${templateJson.pages[0].svg}`
        const inspectResult = await rpc.inspectText(svgPath)
        setSvgElements(inspectResult.texts)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
      setStatus('Error loading template')
    } finally {
      setIsLoading(false)
    }
  }, [templateDir])

  const handleSave = useCallback(async () => {
    if (!template) return
    
    setIsLoading(true)
    setError(null)
    setStatus('Saving template...')
    
    try {
      const result = await rpc.saveTemplate(templateDir, template, true)
      if (result.validation && !result.validation.ok) {
        setStatus(`Saved with ${result.validation.errors.length} validation errors`)
      } else {
        setStatus('Template saved successfully')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
      setStatus('Error saving template')
    } finally {
      setIsLoading(false)
    }
  }, [templateDir, template])

  const handleValidate = useCallback(async () => {
    if (!template) return
    
    setIsLoading(true)
    setError(null)
    setStatus('Validating template...')
    
    try {
      const result = await rpc.validate(templateDir)
      setValidationResult(result)
      setStatus(result.ok ? 'Validation passed' : `Validation failed: ${result.errors.length} errors`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      setStatus('Error during validation')
    } finally {
      setIsLoading(false)
    }
  }, [templateDir, template])

  const handlePreview = useCallback(async () => {
    if (!template) return
    
    setIsLoading(true)
    setError(null)
    setStatus('Generating preview...')
    
    try {
      const outputDir = `out/preview/${template.template.id}-${template.template.version}`
      const result = await rpc.preview(templateDir, outputDir, 'realistic')
      setPreviewResult(result)
      setStatus(result.ok ? `Preview generated: ${result.output?.pages.length || 0} pages` : 'Preview generation failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview generation failed')
      setStatus('Error generating preview')
    } finally {
      setIsLoading(false)
    }
  }, [templateDir, template])

  const handleTemplateChange = useCallback((newTemplate: TemplateConfig) => {
    setTemplate(newTemplate)
  }, [])

  const handlePageSelect = useCallback(async (pageId: string) => {
    if (!template) return
    
    const page = template.pages.find(p => p.id === pageId)
    if (page) {
      setSelectedSvg(page.svg)
      try {
        const svgPath = `${templateDir}/${page.svg}`
        const inspectResult = await rpc.inspectText(svgPath)
        setSvgElements(inspectResult.texts)
      } catch (err) {
        setSvgElements([])
      }
    }
  }, [template, templateDir])

  return (
    <div className="app">
      <header className="app-header">
        <h1>SVG Paper - Template Editor</h1>
        <div className="template-path">
          <input
            type="text"
            value={templateDir}
            onChange={(e) => setTemplateDir((e.target as HTMLInputElement).value)}
            placeholder="Template directory path"
          />
          <button onClick={handleLoad} disabled={isLoading}>Load</button>
        </div>
      </header>

      <Toolbar
        onSave={handleSave}
        onValidate={handleValidate}
        onPreview={handlePreview}
        hasTemplate={!!template}
        isLoading={isLoading}
      />

      <main className="app-main">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {template ? (
          <>
            <div className="editor-pane">
              <TemplateEditor
                template={template}
                onChange={handleTemplateChange}
                onPageSelect={handlePageSelect}
                selectedPageId={selectedSvg ? template.pages.find(p => p.svg === selectedSvg)?.id ?? null : null}
              />
            </div>

            <div className="preview-pane">
              <SvgViewer
                svgPath={selectedSvg ? `${templateDir}/${selectedSvg}` : null}
                elements={svgElements}
                templateDir={templateDir}
              />
            </div>
          </>
        ) : (
          <div className="welcome">
            <h2>Welcome to SVG Paper Template Editor</h2>
            <p>Enter a template directory path and click Load to start editing.</p>
            <p>Example: <code>test-templates/delivery-slip/v1</code></p>
          </div>
        )}
      </main>

      {validationResult && (
        <div className="validation-panel">
          <h3>Validation Results</h3>
          {validationResult.ok ? (
            <p className="success">✓ All checks passed</p>
          ) : (
            <>
              <p className="error">✗ {validationResult.errors.length} errors found</p>
              <ul>
                {validationResult.errors.map((err, i) => (
                  <li key={i}>[{err.code}] {err.file}: {err.message}</li>
                ))}
              </ul>
            </>
          )}
          {validationResult.warnings.length > 0 && (
            <>
              <p className="warning">⚠ {validationResult.warnings.length} warnings</p>
              <ul>
                {validationResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </>
          )}
          <button onClick={() => setValidationResult(null)}>Close</button>
        </div>
      )}

      {previewResult?.ok && previewResult.output && (
        <div className="preview-panel">
          <h3>Preview Generated</h3>
          <p>Pages: {previewResult.output.pages.length}</p>
          <p>HTML: {previewResult.output.html}</p>
          <button onClick={() => window.open(previewResult.output?.html, '_blank')}>
            Open Preview
          </button>
          <button onClick={() => setPreviewResult(null)}>Close</button>
        </div>
      )}

      <StatusBar status={status} />
    </div>
  )
}
