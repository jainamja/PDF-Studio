import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDocument } from '../../state/DocumentContext';
import PageView from './PageView';
import RecentFilesView from '../Common/RecentFilesView';
import { openPdfFiles } from '../../utils/fileUtils';

export default function Viewer() {
  const {
    activeDoc,
    activeTool,
    setZoom,
    setPage,
    loadPdfDocument
  } = useDocument();

  const viewerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Keep track of pinch and multi-touch gestures
  const gestureRef = useRef({
    isPinching: false,
    initialDistance: 0,
    initialScale: 1.0,
    initialMidpoint: { x: 0, y: 0 },
    initialScroll: { left: 0, top: 0 },
    lastTapTime: 0,
    lastTapPos: { x: 0, y: 0 }
  });

  // Calculate effective scale
  let calculatedScale = activeDoc?.scale || 1.0;
  if (typeof calculatedScale === 'string') {
    const viewerWidth = viewerRef.current ? viewerRef.current.clientWidth - 40 : 800;
    const defaultPageWidth = 595.28;
    if (calculatedScale === 'fit-width') {
      calculatedScale = Math.max(0.3, viewerWidth / defaultPageWidth);
    } else if (calculatedScale === 'fit-page') {
      const viewerHeight = viewerRef.current ? viewerRef.current.clientHeight - 40 : 800;
      calculatedScale = Math.min(viewerWidth / defaultPageWidth, viewerHeight / 841.89);
    } else {
      calculatedScale = 1.0;
    }
  }

  // Zoom with Ctrl + Wheel
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoom('in');
        } else {
          setZoom('out');
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [setZoom]);

  // Visual Viewport resize handler to keep focused elements visible with virtual keyboard
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleViewportResize = () => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => window.visualViewport.removeEventListener('resize', handleViewportResize);
  }, []);

  // Multi-touch gestures (Pinch-to-zoom around pinch point, two-finger pan, double-tap to fit-width)
  useEffect(() => {
    const el = viewerRef.current;
    if (!el) return;

    const getTouchDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const getTouchMidpoint = (t1, t2) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    });

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Two fingers detected: start pinch and pan
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = getTouchDistance(t1, t2);
        const mid = getTouchMidpoint(t1, t2);

        gestureRef.current = {
          ...gestureRef.current,
          isPinching: true,
          initialDistance: dist,
          initialScale: typeof calculatedScale === 'number' ? calculatedScale : 1.0,
          initialMidpoint: mid,
          initialScroll: { left: el.scrollLeft, top: el.scrollTop }
        };
      } else if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const prevTap = gestureRef.current.lastTapTime;
        const prevPos = gestureRef.current.lastTapPos;
        const distFromPrev = Math.hypot(touch.clientX - prevPos.x, touch.clientY - prevPos.y);

        // Check for double tap (within 300ms and < 25px)
        if (now - prevTap < 300 && distFromPrev < 25) {
          e.preventDefault();
          if (activeDoc?.scale === 'fit-width') {
            setZoom(1.0);
          } else {
            setZoom('fit-width');
          }
          gestureRef.current.lastTapTime = 0;
        } else {
          gestureRef.current.lastTapTime = now;
          gestureRef.current.lastTapPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && gestureRef.current.isPinching) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = getTouchDistance(t1, t2);
        const mid = getTouchMidpoint(t1, t2);

        const scaleRatio = dist / Math.max(1, gestureRef.current.initialDistance);
        const targetScale = Math.min(5.0, Math.max(0.25, gestureRef.current.initialScale * scaleRatio));

        // Pan delta from midpoint movement
        const deltaX = mid.x - gestureRef.current.initialMidpoint.x;
        const deltaY = mid.y - gestureRef.current.initialMidpoint.y;

        el.scrollLeft = gestureRef.current.initialScroll.left - deltaX;
        el.scrollTop = gestureRef.current.initialScroll.top - deltaY;

        setZoom(Number(targetScale.toFixed(2)));
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2 && gestureRef.current.isPinching) {
        gestureRef.current.isPinching = false;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [activeDoc, calculatedScale, setZoom]);

  // Hand tool panning with pointer events
  const handlePointerDown = (e) => {
    if (activeTool === 'hand' && e.button === 0) {
      setIsPanning(true);
      setStartPan({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewerRef.current.scrollLeft,
        scrollTop: viewerRef.current.scrollTop
      });
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const handlePointerMove = (e) => {
    if (isPanning && viewerRef.current) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      viewerRef.current.scrollLeft = startPan.scrollLeft - dx;
      viewerRef.current.scrollTop = startPan.scrollTop - dy;
    }
  };

  const handlePointerUp = (e) => {
    if (isPanning) {
      setIsPanning(false);
      try { e.target.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  // Track visible page on scroll
  const handleScroll = useCallback(() => {
    if (!viewerRef.current || !activeDoc) return;
    const pageNodes = viewerRef.current.querySelectorAll('.pdf-page-container');
    const containerTop = viewerRef.current.scrollTop;
    const containerMiddle = containerTop + viewerRef.current.clientHeight / 2;

    for (let i = 0; i < pageNodes.length; i++) {
      const p = pageNodes[i];
      const top = p.offsetTop;
      const bottom = top + p.clientHeight;
      if (containerMiddle >= top && containerMiddle <= bottom) {
        setPage(i + 1);
        break;
      }
    }
  }, [activeDoc, setPage]);

  // Drag and Drop files to open
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));

    for (const file of pdfFiles) {
      const buffer = await file.arrayBuffer();
      await loadPdfDocument(file.name, new Uint8Array(buffer), file.path || null);
    }
  };

  // If no document is open, render clean welcome slate with recent files
  if (!activeDoc) {
    return (
      <div
        className="viewer-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <RecentFilesView
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      className={`viewer-container ${activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onScroll={handleScroll}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {Array.from({ length: activeDoc.pageCount }, (_, i) => (
        <PageView
          key={`${activeDoc.id}_p_${i}`}
          pageIndex={i}
          docId={activeDoc.id}
          scale={calculatedScale}
        />
      ))}
    </div>
  );
}
