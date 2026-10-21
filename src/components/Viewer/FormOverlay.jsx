import React from 'react';
import { useDocument } from '../../state/DocumentContext';

export default function FormOverlay({ pageIndex, scale }) {
  const { activeDoc, setFormValue } = useDocument();
  if (!activeDoc || !activeDoc.formFields) return null;

  const pageFields = activeDoc.formFields.filter(f => f.pageIndex === pageIndex);
  if (pageFields.length === 0) return null;

  return (
    <div
      className="annotation-overlay interactive"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none'
      }}
    >
      {pageFields.map(field => {
        const rect = field.rect;
        const currentVal = activeDoc.formValues[field.name] !== undefined
          ? activeDoc.formValues[field.name]
          : field.value;

        const style = {
          position: 'absolute',
          left: `${rect.x * scale}px`,
          top: `${rect.y * scale}px`,
          width: `${rect.width * scale}px`,
          height: `${rect.height * scale}px`,
          pointerEvents: 'auto',
          boxSizing: 'border-box',
          backgroundColor: 'rgba(219, 234, 254, 0.45)', // subtle light blue highlight
          border: '1px solid #3b82f6',
          borderRadius: '2px',
          padding: '2px 4px',
          fontSize: `${Math.max(10, Math.min(16, rect.height * scale * 0.7))}px`,
          color: '#0f172a',
          outline: 'none'
        };

        if (field.type === 'checkbox') {
          return (
            <input
              key={field.id}
              data-field-name={field.name}
              type="checkbox"
              checked={!!currentVal}
              onChange={(e) => setFormValue(field.name, e.target.checked)}
              style={{
                ...style,
                cursor: 'pointer',
                accentColor: '#6366f1'
              }}
            />
          );
        }

        if (field.type === 'dropdown') {
          return (
            <select
              key={field.id}
              data-field-name={field.name}
              value={currentVal || ''}
              onChange={(e) => setFormValue(field.name, e.target.value)}
              style={style}
            >
              {field.options && field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          );
        }

        return (
          <input
            key={field.id}
            data-field-name={field.name}
            type="text"
            value={currentVal || ''}
            onChange={(e) => setFormValue(field.name, e.target.value)}
            style={style}
          />
        );
      })}
    </div>
  );
}
