import React, { useEffect, useRef, useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import TextLayerOverlay from './TextLayerOverlay';
import AnnotationOverlay from './AnnotationOverlay';
import FormOverlay from './FormOverlay';

export default function PageView({ pageIndex, docId, scale }) {
  const { activeDoc, activeTool, setActiveTool, addAnnotation } = useDocument();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfPage, setPdfPage] = useState(null);
  const [viewport, setViewport] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  // IntersectionObserver for lazy page rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          } else {
            // Keep rendered page dimensions but can offload memory if far
          }
        });
      },
      { rootMargin: '400px 0px 400px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch page proxy from pdfjs
  useEffect(() => {
    if (!activeDoc || !activeDoc.pdfDoc || !isVisible) return;

    let isCancelled = false;
    activeDoc.pdfDoc.getPage(pageIndex + 1).then(page => {
      if (isCancelled) return;
      setPdfPage(page);
      const vp = page.getViewport({ scale: typeof scale === 'number' ? scale : 1.0 });
      setViewport(vp);
    }).catch(err => {
      if (!isCancelled) console.error('Error fetching page:', err);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeDoc, isVisible, pageIndex, scale]);

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfPage || !viewport || !isVisible) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (renderTaskRef.current && renderTaskRef.current.cancel) {
      renderTaskRef.current.cancel();
    }

    const renderTask = pdfPage.render({
      canvasContext: ctx,
      viewport
    });

    renderTaskRef.current = renderTask;

    renderTask.promise.then(() => {
      setIsRendered(true);
    }).catch(err => {
      if (err.name !== 'RenderingCancelledException') {
        console.warn('Canvas render notice:', err);
      }
    });

    return () => {
      if (renderTaskRef.current && renderTaskRef.current.cancel) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfPage, viewport, isVisible]);

  // Text selection handler
  const handleTextSelect = ({ text, x, y, width, height }) => {
    if (!text || text.trim() === '') return;

    if (['highlight', 'underline', 'strikethrough'].includes(activeTool)) {
      addAnnotation({
        pageIndex,
        type: activeTool,
        x,
        y,
        width,
        height,
        color: activeTool === 'highlight' ? '#fef08a' : '#ef4444'
      });
      setActiveTool('select');
    } else if (activeTool === 'edit-text') {
      // Cover the original text line and replace it with editable text
      addAnnotation({
        pageIndex,
        type: 'edit-text',
        text: text.trim(),
        x,
        y: y - 2,
        width: width + 8,
        height: Math.max(20, height + 4),
        fontSize: Math.round(height * 0.85) || 12,
        backgroundColor: '#ffffff',
        color: '#000000'
      });
      setActiveTool('select');
    }
  };

  const currentScale = typeof scale === 'number' ? scale : 1.0;
  const width = viewport ? viewport.width : 595.28 * currentScale;
  const height = viewport ? viewport.height : 841.89 * currentScale;

  return (
    <div
      ref={containerRef}
      className="pdf-page-container"
      data-page-index={pageIndex}
      style={{
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      <canvas ref={canvasRef} className="pdf-canvas" />

      {pdfPage && viewport && isRendered && (
        <>
          <TextLayerOverlay
            pdfPage={pdfPage}
            viewport={viewport}
            onTextSelect={handleTextSelect}
          />
          <FormOverlay
            pageIndex={pageIndex}
            scale={currentScale}
          />
          <AnnotationOverlay
            pageIndex={pageIndex}
            scale={currentScale}
            viewport={viewport}
          />
        </>
      )}
    </div>
  );
}
