import { useState, useEffect } from 'preact/hooks'
import type { TextElement } from '../types/api'

interface SvgViewerProps {
  svgPath: string | null
  elements: TextElement[]
  templateDir: string
}

export function SvgViewer({ svgPath, elements, templateDir }: SvgViewerProps) {
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<number | null>(null)

  useEffect(() => {
    if (!svgPath) {
      setSvgContent(null)
      return
    }

    const loadSvg = async () => {
      setLoading(true)
      setError(null)
      // templateDir is used to construct the full path context
      void templateDir
      try {
        const response = await fetch(`/api/svg?path=${encodeURIComponent(svgPath)}`)
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.status}`)
        }
        const content = await response.text()
        setSvgContent(content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load SVG')
      } finally {
        setLoading(false)
      }
    }

    loadSvg()
  }, [svgPath])

  if (!svgPath) {
    return (
      <div className="svg-viewer empty">
        <p>Select a page to view its SVG</p>
      </div>
    )
  }

  return (
    <div className="svg-viewer">
      <div className="svg-preview">
        <h3>SVG Preview</h3>
        <div className="svg-path">{svgPath}</div>
        
        {loading && <div className="loading">Loading SVG...</div>}
        {error && <div className="error">{error}</div>}
        
        {svgContent && (
          <div 
            className="svg-container"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>

      <div className="elements-list">
        <h3>Text Elements ({elements.length})</h3>
        
        {elements.length === 0 ? (
          <p className="empty">No text elements found in this SVG</p>
        ) : (
          <ul>
            {elements.map((element, index) => (
              <li 
                key={index}
                className={`element-item ${selectedElement === index ? 'selected' : ''}`}
                onClick={() => setSelectedElement(index)}
              >
                <div className="element-header">
                  <span className="element-index">#{element.index}</span>
                  <span className="element-id">
                    {element.id || element.suggestedId || '(no id)'}
                  </span>
                </div>
                <div className="element-text">{element.text}</div>
                <div className="element-position">
                  pos: ({element.position.x.toFixed(1)}, {element.position.y.toFixed(1)})
                </div>
              </li>
            ))}
          </ul>
        )}

        {selectedElement !== null && elements[selectedElement] && (
          <div className="element-details">
            <h4>Element Details</h4>
            <dl>
              <dt>Index</dt>
              <dd>{elements[selectedElement].index}</dd>
              
              <dt>ID</dt>
              <dd>{elements[selectedElement].id || '(none)'}</dd>
              
              <dt>Suggested ID</dt>
              <dd>{elements[selectedElement].suggestedId || '(none)'}</dd>
              
              <dt>Text</dt>
              <dd>{elements[selectedElement].text}</dd>
              
              <dt>Position</dt>
              <dd>
                x: {elements[selectedElement].position.x.toFixed(2)}<br />
                y: {elements[selectedElement].position.y.toFixed(2)}
              </dd>
              
              <dt>Bounding Box</dt>
              <dd>
                x: {elements[selectedElement].bbox.x.toFixed(2)}<br />
                y: {elements[selectedElement].bbox.y.toFixed(2)}<br />
                w: {elements[selectedElement].bbox.w.toFixed(2)}<br />
                h: {elements[selectedElement].bbox.h.toFixed(2)}
              </dd>
              
              <dt>Font Size</dt>
              <dd>{elements[selectedElement].font.size?.toFixed(2) || 'unknown'}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
