import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Bold, Italic, Check } from 'lucide-react';

export default function MobileBottomSheet() {
  const {
    isBottomSheetOpen,
    setIsBottomSheetOpen,
    activeProperties,
    setActiveProperties,
    selectedAnnotationId,
    updateAnnotation,
    activeDoc
  } = useDocument();

  if (!isBottomSheetOpen) return null;

  const palette = [
    '#ef4444', // Red
    '#f59e0b', // Amber/Yellow
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#0f172a', // Dark slate
    '#ffffff'  // White
  ];

  const updateProp = (key, value) => {
    setActiveProperties(prev => ({ ...prev, [key]: value }));
    if (selectedAnnotationId && activeDoc) {
      updateAnnotation(selectedAnnotationId, { [key]: value });
    }
  };

  return (
    <>
      <div className="mobile-sheet-backdrop" onClick={() => setIsBottomSheetOpen(false)} />
      <div className="mobile-bottom-sheet">
        {/* Drag Handle */}
        <div className="mobile-sheet-handle-bar" onClick={() => setIsBottomSheetOpen(false)}>
          <div className="mobile-sheet-handle" />
        </div>

        <div className="mobile-sheet-header">
          <span style={{ fontWeight: 600, fontSize: 14 }}>Tool Styling & Properties</span>
          <button
            onClick={() => setIsBottomSheetOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mobile-sheet-content">
          {/* Color Palette */}
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
              Color
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
              {palette.map(c => {
                const isSelected = activeProperties.strokeColor === c || activeProperties.color === c;
                return (
                  <div
                    key={c}
                    onClick={() => {
                      updateProp('strokeColor', c);
                      updateProp('color', c);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isSelected ? '0 0 0 3px #6366f1' : 'none'
                    }}
                  >
                    {isSelected && (
                      <Check size={16} color={c === '#ffffff' || c === '#f59e0b' ? '#0f172a' : '#ffffff'} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stroke Thickness */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Thickness</span>
              <span style={{ fontWeight: 600 }}>{activeProperties.strokeWidth} px</span>
            </div>
            <input
              type="range"
              min="1"
              max="16"
              value={activeProperties.strokeWidth || 2}
              onChange={(e) => updateProp('strokeWidth', parseInt(e.target.value, 10))}
              style={{ width: '100%', height: 32 }}
            />
          </div>

          {/* Opacity */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Opacity</span>
              <span style={{ fontWeight: 600 }}>{Math.round((activeProperties.opacity || 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={activeProperties.opacity !== undefined ? activeProperties.opacity : 1.0}
              onChange={(e) => updateProp('opacity', parseFloat(e.target.value))}
              style={{ width: '100%', height: 32 }}
            />
          </div>

          {/* Text Font Size & Styling */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Font Size & Style</span>
              <span style={{ fontWeight: 600 }}>{activeProperties.fontSize || 14} pt</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="range"
                min="10"
                max="48"
                value={activeProperties.fontSize || 14}
                onChange={(e) => updateProp('fontSize', parseInt(e.target.value, 10))}
                style={{ flex: 1, height: 32 }}
              />
              <button
                className={`mobile-subtool-btn ${activeProperties.isBold ? 'active' : ''}`}
                onClick={() => updateProp('isBold', !activeProperties.isBold)}
                style={{ minWidth: 40, height: 40 }}
              >
                <Bold size={16} />
              </button>
              <button
                className={`mobile-subtool-btn ${activeProperties.isItalic ? 'active' : ''}`}
                onClick={() => updateProp('isItalic', !activeProperties.isItalic)}
                style={{ minWidth: 40, height: 40 }}
              >
                <Italic size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
