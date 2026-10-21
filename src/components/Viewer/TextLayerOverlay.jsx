import React, { useEffect, useRef } from 'react';
import pdfjsLib from '../../utils/pdfjsConfig';
import { useDocument } from '../../state/DocumentContext';

export default function TextLayerOverlay({ pdfPage, viewport, onTextSelect }) {
  const { activeTool } = useDocument();
  const containerRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdfPage || !viewport) return;

    container.innerHTML = '';

    let isCancelled = false;

    pdfPage.getTextContent().then(textContent => {
      if (isCancelled) return;

      const task = pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container,
        viewport,
        textDivs: []
      });

      renderTaskRef.current = task;
    }).catch(err => {
      if (!isCancelled) console.warn('Text layer render notice:', err);
    });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current && renderTaskRef.current.cancel) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfPage, viewport]);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !onTextSelect) return;

    const range = selection.getRangeAt(0);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const rangeRect = range.getBoundingClientRect();

    if (rangeRect.width > 0 && rangeRect.height > 0) {
      // Relative to page container in view coordinates
      const scale = viewport.scale || 1;
      const viewX = (rangeRect.left - containerRect.left) / scale;
      const viewY = (rangeRect.top - containerRect.top) / scale;
      const viewW = rangeRect.width / scale;
      const viewH = rangeRect.height / scale;
      const selectedText = selection.toString();

      onTextSelect({
        text: selectedText,
        x: viewX,
        y: viewY,
        width: viewW,
        height: viewH,
        clientX: rangeRect.left + rangeRect.width / 2,
        clientY: rangeRect.top
      });
    }
  };

  const handleClick = (e) => {
    if (activeTool === 'edit-text') {
      const span = e.target.closest('span');
      if (span && span.textContent && span.textContent.trim()) {
        const rect = span.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const scale = viewport.scale || 1;
        const viewX = (rect.left - containerRect.left) / scale;
        const viewY = (rect.top - containerRect.top) / scale;
        const viewW = rect.width / scale;
        const viewH = rect.height / scale;

        onTextSelect({
          text: span.textContent.trim(),
          x: viewX,
          y: viewY,
          width: viewW,
          height: viewH,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top
        });
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="text-layer"
      onMouseUp={handleSelection}
      onPointerUp={handleSelection}
      onClick={handleClick}
      style={{
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
        pointerEvents: activeTool === 'hand' ? 'none' : 'auto'
      }}
    />
  );
}
