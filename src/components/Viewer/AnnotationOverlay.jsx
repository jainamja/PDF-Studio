import React, { useState, useRef } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { MessageSquare } from 'lucide-react';

export default function AnnotationOverlay({ pageIndex, scale, viewport }) {
  const {
    activeDoc,
    activeTool,
    setActiveTool,
    stampType,
    activeProperties,
    selectedAnnotationId,
    setSelectedAnnotationId,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation
  } = useDocument();

  const containerRef = useRef(null);

  // Drawing in progress
  const [drawingState, setDrawingState] = useState(null);
  // Dragging / Resizing in progress
  const [interactionState, setInteractionState] = useState(null);
  // Open sticky note popups
  const [openStickyId, setOpenStickyId] = useState(null);

  // Palm rejection: track active pen pointer id
  const activePenIdRef = useRef(null);

  const pageAnnots = (activeDoc?.annotations || []).filter(a => a.pageIndex === pageIndex);

  // Convert pointer event to view coordinates (unscaled)
  const getEventViewCoords = (e) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };
  };

  // Pointer Down handler
  const handlePointerDown = (e) => {
    // Only handle primary button
    if (e.button !== 0) return;

    // Palm rejection: if a pen is currently active and this is touch, reject palm
    if (e.pointerType === 'pen') {
      activePenIdRef.current = e.pointerId;
    } else if (activePenIdRef.current !== null && e.pointerType === 'touch') {
      return;
    }

    // Allow two-finger gestures to pass through to viewer
    if (e.pointerType === 'touch' && !e.isPrimary) {
      return;
    }

    const coords = getEventViewCoords(e);
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

    // If a drawing tool is active
    if (['rectangle', 'ellipse', 'whiteout', 'highlight', 'line', 'arrow', 'ink'].includes(activeTool)) {
      e.stopPropagation();
      try { e.target.setPointerCapture(e.pointerId); } catch {}

      if (activeTool === 'ink') {
        setDrawingState({
          type: 'ink',
          pointerId: e.pointerId,
          points: [{ ...coords, pressure }],
          startX: coords.x,
          startY: coords.y
        });
      } else {
        setDrawingState({
          type: activeTool,
          pointerId: e.pointerId,
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y
        });
      }
      return;
    }

    if (activeTool === 'add-text') {
      e.stopPropagation();
      addAnnotation({
        pageIndex,
        type: 'text',
        text: 'Type text here',
        x: coords.x,
        y: coords.y,
        width: 140,
        height: 32,
        fontSize: activeProperties.fontSize || 14,
        color: activeProperties.color || '#000000',
        fontFamily: activeProperties.fontFamily || 'Helvetica',
        isBold: activeProperties.isBold,
        isItalic: activeProperties.isItalic
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'sticky') {
      e.stopPropagation();
      addAnnotation({
        pageIndex,
        type: 'sticky',
        text: 'Note comment',
        x: coords.x,
        y: coords.y,
        author: 'User'
      });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'stamp') {
      e.stopPropagation();
      addAnnotation({
        pageIndex,
        type: 'stamp',
        stampType: stampType || 'APPROVED',
        x: coords.x,
        y: coords.y,
        width: 140,
        height: 50
      });
      setActiveTool('select');
      return;
    }

    // Deselect if clicking blank page
    if (selectedAnnotationId) {
      setSelectedAnnotationId(null);
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    // Palm rejection
    if (activePenIdRef.current !== null && e.pointerType === 'touch') {
      return;
    }

    const coords = getEventViewCoords(e);
    const pressure = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;

    if (drawingState) {
      e.stopPropagation();
      if (drawingState.type === 'ink') {
        setDrawingState(prev => ({
          ...prev,
          points: [...prev.points, { ...coords, pressure }]
        }));
      } else {
        setDrawingState(prev => ({
          ...prev,
          currentX: coords.x,
          currentY: coords.y
        }));
      }
      return;
    }

    if (interactionState) {
      e.stopPropagation();
      const { type, annId, startMouseX, startMouseY, startAnn, handle } = interactionState;
      const dx = coords.x - startMouseX;
      const dy = coords.y - startMouseY;

      if (type === 'move') {
        updateAnnotation(annId, {
          x: Math.max(0, startAnn.x + dx),
          y: Math.max(0, startAnn.y + dy)
        });
      } else if (type === 'resize') {
        let newX = startAnn.x;
        let newY = startAnn.y;
        let newW = startAnn.width;
        let newH = startAnn.height;

        if (handle.includes('e')) newW = Math.max(10, startAnn.width + dx);
        if (handle.includes('s')) newH = Math.max(10, startAnn.height + dy);
        if (handle.includes('w')) {
          const w = Math.max(10, startAnn.width - dx);
          newX = startAnn.x + (startAnn.width - w);
          newW = w;
        }
        if (handle.includes('n')) {
          const h = Math.max(10, startAnn.height - dy);
          newY = startAnn.y + (startAnn.height - h);
          newH = h;
        }

        updateAnnotation(annId, { x: newX, y: newY, width: newW, height: newH });
      }
    }
  };

  // Pointer Up / Cancel
  const handlePointerUp = (e) => {
    if (activePenIdRef.current === e.pointerId) {
      activePenIdRef.current = null;
    }

    if (drawingState) {
      e.stopPropagation();
      try { e.target.releasePointerCapture(e.pointerId); } catch {}

      const coords = getEventViewCoords(e);

      if (drawingState.type === 'ink') {
        if (drawingState.points.length > 1) {
          addAnnotation({
            pageIndex,
            type: 'ink',
            points: drawingState.points,
            strokeColor: activeProperties.strokeColor || '#2563eb',
            strokeWidth: activeProperties.strokeWidth || 2
          });
        }
      } else if (['line', 'arrow'].includes(drawingState.type)) {
        const dx = coords.x - drawingState.startX;
        const dy = coords.y - drawingState.startY;
        if (Math.hypot(dx, dy) > 5) {
          addAnnotation({
            pageIndex,
            type: drawingState.type,
            x1: drawingState.startX,
            y1: drawingState.startY,
            x2: coords.x,
            y2: coords.y,
            strokeColor: activeProperties.strokeColor || '#ef4444',
            strokeWidth: activeProperties.strokeWidth || 2
          });
        }
      } else {
        const x = Math.min(drawingState.startX, coords.x);
        const y = Math.min(drawingState.startY, coords.y);
        const width = Math.abs(coords.x - drawingState.startX);
        const height = Math.abs(coords.y - drawingState.startY);

        if (width > 5 && height > 5) {
          addAnnotation({
            pageIndex,
            type: drawingState.type,
            x,
            y,
            width,
            height,
            color: activeTool === 'whiteout' ? '#ffffff' : activeProperties.color,
            strokeColor: activeProperties.strokeColor,
            fillColor: activeProperties.fillColor,
            strokeWidth: activeProperties.strokeWidth,
            opacity: activeTool === 'highlight' ? 0.4 : activeProperties.opacity
          });
        }
      }

      setDrawingState(null);
      setActiveTool('select');
    }

    if (interactionState) {
      setInteractionState(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`annotation-overlay ${activeTool !== 'hand' ? 'interactive' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: activeTool === 'hand' ? 'none' : 'auto',
        touchAction: ['rectangle', 'ellipse', 'whiteout', 'highlight', 'line', 'arrow', 'ink'].includes(activeTool)
          ? 'none'
          : 'pan-x pan-y'
      }}
    >
      {/* Existing Annotations */}
      {pageAnnots.map(ann => {
        const isSelected = selectedAnnotationId === ann.id;

        // Sticky Note Marker
        if (ann.type === 'sticky') {
          return (
            <div
              key={ann.id}
              className={`annotation-item ${isSelected ? 'selected' : ''}`}
              style={{
                left: `${ann.x * scale}px`,
                top: `${ann.y * scale}px`,
                zIndex: 30
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAnnotationId(ann.id);
                setOpenStickyId(openStickyId === ann.id ? null : ann.id);
              }}
            >
              <div className="sticky-note-marker">
                <MessageSquare size={16} />
              </div>
              {openStickyId === ann.id && (
                <div className="sticky-note-popup" onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: '#94a3b8' }}>
                    <span>Note ({ann.author || 'User'})</span>
                    <button
                      onClick={() => deleteAnnotation(ann.id)}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                  <textarea
                    value={ann.text || ''}
                    onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                    placeholder="Enter comment..."
                  />
                </div>
              )}
            </div>
          );
        }

        // Ink Path
        if (ann.type === 'ink' && ann.points && ann.points.length > 1) {
          const pathData = ann.points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`, '');
          return (
            <svg
              key={ann.id}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', width: '100%', height: '100%', overflow: 'visible' }}
              onClick={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}
            >
              <path
                d={pathData}
                stroke={ann.strokeColor || '#2563eb'}
                strokeWidth={(ann.strokeWidth || 2) * scale}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          );
        }

        // Line / Arrow
        if (['line', 'arrow'].includes(ann.type)) {
          return (
            <svg
              key={ann.id}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', width: '100%', height: '100%', overflow: 'visible' }}
              onClick={(e) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); }}
            >
              <line
                x1={ann.x1 * scale}
                y1={ann.y1 * scale}
                x2={ann.x2 * scale}
                y2={ann.y2 * scale}
                stroke={ann.strokeColor || '#ef4444'}
                strokeWidth={(ann.strokeWidth || 2) * scale}
              />
            </svg>
          );
        }

        // Box elements (Rectangle, Ellipse, Text, Whiteout, Highlight, Stamp, Image, Edit-Text)
        const style = {
          left: `${ann.x * scale}px`,
          top: `${ann.y * scale}px`,
          width: `${ann.width * scale}px`,
          height: `${ann.height * scale}px`,
          opacity: ann.opacity !== undefined ? ann.opacity : 1
        };

        return (
          <div
            key={ann.id}
            className={`annotation-item ${isSelected ? 'selected' : ''}`}
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedAnnotationId(ann.id);
            }}
            onPointerDown={(e) => {
              if (activeTool === 'select' && e.button === 0) {
                e.stopPropagation();
                setSelectedAnnotationId(ann.id);
                const coords = getEventViewCoords(e);
                setInteractionState({
                  type: 'move',
                  annId: ann.id,
                  startMouseX: coords.x,
                  startMouseY: coords.y,
                  startAnn: { ...ann }
                });
                try { e.target.setPointerCapture(e.pointerId); } catch {}
              }
            }}
          >
            {/* Whiteout */}
            {(ann.type === 'whiteout' || ann.type === 'edit-text-cover') && (
              <div style={{ width: '100%', height: '100%', backgroundColor: ann.color || '#ffffff' }} />
            )}

            {/* Highlight */}
            {ann.type === 'highlight' && (
              <div style={{ width: '100%', height: '100%', backgroundColor: ann.color || '#fef08a', opacity: ann.opacity || 0.4 }} />
            )}

            {/* Underline / Strikethrough */}
            {['underline', 'strikethrough'].includes(ann.type) && (
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: ann.type === 'underline' ? '90%' : '50%',
                height: `${(ann.thickness || 2) * scale}px`,
                backgroundColor: ann.color || '#ef4444'
              }} />
            )}

            {/* Rectangle */}
            {ann.type === 'rectangle' && (
              <div style={{
                width: '100%',
                height: '100%',
                border: `${(ann.strokeWidth || 2) * scale}px solid ${ann.strokeColor || '#ef4444'}`,
                backgroundColor: ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : 'transparent',
                boxSizing: 'border-box'
              }} />
            )}

            {/* Ellipse */}
            {ann.type === 'ellipse' && (
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: `${(ann.strokeWidth || 2) * scale}px solid ${ann.strokeColor || '#ef4444'}`,
                backgroundColor: ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : 'transparent',
                boxSizing: 'border-box'
              }} />
            )}

            {/* Stamp */}
            {ann.type === 'stamp' && (
              <div style={{
                width: '100%',
                height: '100%',
                border: `3px solid ${ann.color || (ann.stampType === 'APPROVED' ? '#16a34a' : '#dc2626')}`,
                backgroundColor: 'rgba(22, 163, 74, 0.08)',
                color: ann.color || (ann.stampType === 'APPROVED' ? '#16a34a' : '#dc2626'),
                fontWeight: 800,
                fontSize: `${Math.max(12, ann.height * scale * 0.45)}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: '1px',
                borderRadius: '4px'
              }}>
                {ann.stampType || 'APPROVED'}
              </div>
            )}

            {/* Image / Signature */}
            {['image', 'signature'].includes(ann.type) && (ann.dataUrl || ann.imageSrc) && (
              <img
                src={ann.dataUrl || ann.imageSrc}
                alt="annotation"
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
              />
            )}

            {/* Text Box / Edit Text */}
            {['text', 'edit-text'].includes(ann.type) && (
              <textarea
                value={ann.text || ''}
                onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
                style={{
                  width: '100%',
                  height: '100%',
                  background: ann.type === 'edit-text' ? (ann.backgroundColor || '#ffffff') : (ann.backgroundColor || 'transparent'),
                  border: isSelected ? '1px dashed #6366f1' : 'none',
                  outline: 'none',
                  color: ann.color || '#000000',
                  fontSize: `${(ann.fontSize || 14) * scale}px`,
                  fontFamily: ann.fontFamily || 'Helvetica, sans-serif',
                  fontWeight: ann.isBold ? 'bold' : 'normal',
                  fontStyle: ann.isItalic ? 'italic' : 'normal',
                  resize: 'none',
                  overflow: 'hidden',
                  padding: 2,
                  boxSizing: 'border-box'
                }}
              />
            )}

            {/* Resize Handles when selected (minimum 28px hit target on touch) */}
            {isSelected && (
              <>
                {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map(handle => (
                  <div
                    key={handle}
                    className={`resize-handle ${handle}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const coords = getEventViewCoords(e);
                      setInteractionState({
                        type: 'resize',
                        annId: ann.id,
                        handle,
                        startMouseX: coords.x,
                        startMouseY: coords.y,
                        startAnn: { ...ann }
                      });
                      try { e.target.setPointerCapture(e.pointerId); } catch {}
                    }}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Live Drawing Preview with pressure support */}
      {drawingState && (
        <>
          {drawingState.type === 'ink' && drawingState.points.length > 1 && (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <path
                d={drawingState.points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`, '')}
                stroke={activeProperties.strokeColor || '#2563eb'}
                strokeWidth={(activeProperties.strokeWidth || 2) * scale * (drawingState.points[drawingState.points.length - 1].pressure ? Math.max(0.6, drawingState.points[drawingState.points.length - 1].pressure * 1.5) : 1)}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}

          {['line', 'arrow'].includes(drawingState.type) && (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <line
                x1={drawingState.startX * scale}
                y1={drawingState.startY * scale}
                x2={drawingState.currentX * scale}
                y2={drawingState.currentY * scale}
                stroke={activeProperties.strokeColor || '#ef4444'}
                strokeWidth={(activeProperties.strokeWidth || 2) * scale}
              />
            </svg>
          )}

          {['rectangle', 'ellipse', 'whiteout', 'highlight'].includes(drawingState.type) && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(drawingState.startX, drawingState.currentX) * scale}px`,
                top: `${Math.min(drawingState.startY, drawingState.currentY) * scale}px`,
                width: `${Math.abs(drawingState.currentX - drawingState.startX) * scale}px`,
                height: `${Math.abs(drawingState.currentY - drawingState.startY) * scale}px`,
                backgroundColor: drawingState.type === 'whiteout'
                  ? '#ffffff'
                  : drawingState.type === 'highlight'
                  ? 'rgba(254, 240, 138, 0.4)'
                  : 'rgba(99, 102, 241, 0.1)',
                border: drawingState.type === 'ellipse' || drawingState.type === 'rectangle'
                  ? '2px solid #ef4444'
                  : '1px dashed #6366f1',
                borderRadius: drawingState.type === 'ellipse' ? '50%' : '2px',
                pointerEvents: 'none'
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
