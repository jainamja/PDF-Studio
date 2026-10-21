import React, { useEffect, useRef } from 'react';
import pdfjsLib from '../../utils/pdfjsConfig';

export default function TextLayerOverlay({ pdfPage, viewport, onTextSelect }) {
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

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !onTextSelect) return;

    const range = selection.getRangeAt(0);
    const containerRect = containerRef.current.getBoundingClientRect();
    const rangeRect = range.getBoundingClientRect();

    if (rangeRect.width > 0 && rangeRect.height > 0) {
      // Relative to page container in view coordinates
      const viewX = (rangeRect.left - containerRect.left) / (viewport.scale || 1);
      const viewY = (rangeRect.top - containerRect.top) / (viewport.scale || 1);
      const viewW = rangeRect.width / (viewport.scale || 1);
      const viewH = rangeRect.height / (viewport.scale || 1);
      const selectedText = selection.toString();

      onTextSelect({
        text: selectedText,
        x: viewX,
        y: viewY,
        width: viewW,
        height: viewH
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="text-layer"
      onMouseUp={handleMouseUp}
      style={{
        width: `${viewport.width}px`,
        height: `${viewport.height}px`
      }}
    />
  );
}
