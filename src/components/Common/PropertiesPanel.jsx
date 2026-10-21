import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Bold, Italic, Trash2 } from 'lucide-react';

export default function PropertiesPanel() {
  const {
    activeDoc,
    selectedAnnotationId,
    setSelectedAnnotationId,
    updateAnnotation,
    deleteAnnotation
  } = useDocument();

  if (!activeDoc || !selectedAnnotationId) return null;

  const ann = activeDoc.annotations.find(a => a.id === selectedAnnotationId);
  if (!ann) return null;

  const isText = ['text', 'edit-text'].includes(ann.type);
  const isShape = ['rectangle', 'ellipse', 'line', 'arrow', 'ink'].includes(ann.type);

  return (
    <div className="properties-panel">
      <div className="properties-panel-header">
        <span>Object Properties</span>
        <button
          onClick={() => setSelectedAnnotationId(null)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Text Properties */}
      {isText && (
        <>
          <div className="properties-row">
            <span>Font Size</span>
            <input
              type="number"
              className="input-field"
              value={ann.fontSize || 14}
              onChange={(e) => updateAnnotation(ann.id, { fontSize: parseInt(e.target.value, 10) || 12 })}
              style={{ width: 60 }}
              min="8"
              max="72"
            />
          </div>

          <div className="properties-row">
            <span>Text Color</span>
            <input
              type="color"
              value={ann.color || '#000000'}
              onChange={(e) => updateAnnotation(ann.id, { color: e.target.value })}
              style={{ width: 36, height: 26, padding: 0, border: 'none', cursor: 'pointer' }}
            />
          </div>

          <div className="properties-row">
            <span>Style</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`ribbon-btn-sm ${ann.isBold ? 'active' : ''}`}
                onClick={() => updateAnnotation(ann.id, { isBold: !ann.isBold })}
              >
                <Bold size={14} />
              </button>
              <button
                className={`ribbon-btn-sm ${ann.isItalic ? 'active' : ''}`}
                onClick={() => updateAnnotation(ann.id, { isItalic: !ann.isItalic })}
              >
                <Italic size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Shape Properties */}
      {isShape && (
        <>
          <div className="properties-row">
            <span>Stroke Color</span>
            <input
              type="color"
              value={ann.strokeColor || '#ef4444'}
              onChange={(e) => updateAnnotation(ann.id, { strokeColor: e.target.value })}
              style={{ width: 36, height: 26, padding: 0, border: 'none', cursor: 'pointer' }}
            />
          </div>

          {['rectangle', 'ellipse'].includes(ann.type) && (
            <div className="properties-row">
              <span>Fill Color</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="color"
                  value={ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : '#ffffff'}
                  onChange={(e) => updateAnnotation(ann.id, { fillColor: e.target.value })}
                  style={{ width: 36, height: 26, padding: 0, border: 'none', cursor: 'pointer' }}
                />
                <button
                  className="btn btn-secondary"
                  style={{ padding: '2px 6px', fontSize: 10 }}
                  onClick={() => updateAnnotation(ann.id, { fillColor: 'transparent' })}
                >
                  None
                </button>
              </div>
            </div>
          )}

          <div className="properties-row">
            <span>Line Width</span>
            <input
              type="range"
              min="1"
              max="12"
              value={ann.strokeWidth || 2}
              onChange={(e) => updateAnnotation(ann.id, { strokeWidth: parseInt(e.target.value, 10) })}
              style={{ width: 90 }}
            />
            <span>{ann.strokeWidth || 2}px</span>
          </div>
        </>
      )}

      {/* Opacity */}
      <div className="properties-row">
        <span>Opacity</span>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={ann.opacity !== undefined ? ann.opacity : 1.0}
          onChange={(e) => updateAnnotation(ann.id, { opacity: parseFloat(e.target.value) })}
          style={{ width: 90 }}
        />
        <span>{Math.round((ann.opacity !== undefined ? ann.opacity : 1.0) * 100)}%</span>
      </div>

      {/* Delete Object Action */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
        <button
          className="btn btn-danger"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px' }}
          onClick={() => deleteAnnotation(ann.id)}
          title="Delete selected object (Delete key)"
        >
          <Trash2 size={14} /> Delete Object
        </button>
      </div>
    </div>
  );
}
