import React, { useRef, useEffect, useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import PageView from './PageView';
import { FileUp, PlusCircle } from 'lucide-react';
import { openPdfFiles } from '../../utils/fileUtils';

export default function Viewer() {
  const {
    activeDoc,
    activeTool,
    setZoom,
    setPage,
    loadPdfDocument,
    createBlankDocument
  } = useDocument();

  const viewerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Hand tool panning
  const handleMouseDown = (e) => {
    if (activeTool === 'hand' && e.button === 0) {
      setIsPanning(true);
      setStartPan({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewerRef.current.scrollLeft,
        scrollTop: viewerRef.current.scrollTop
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && viewerRef.current) {
      const dx = e.clientX - startPan.x;
      const dy = e.clientY - startPan.y;
      viewerRef.current.scrollLeft = startPan.scrollLeft - dx;
      viewerRef.current.scrollTop = startPan.scrollTop - dy;
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
  };

  // Track visible page on scroll
  const handleScroll = () => {
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
  };

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

  // If no document is open, render clean welcome slate
  if (!activeDoc) {
    return (
      <div
        className="viewer-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="welcome-screen">
          <div
            className={`drop-zone ${isDragOver ? 'drag-active' : ''}`}
            onClick={async () => {
              const files = await openPdfFiles();
              for (const f of files) {
                await loadPdfDocument(f.name, f.bytes, f.path);
              }
            }}
          >
            <FileUp size={54} color="#6366f1" style={{ marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#f8fafc' }}>Open or Drop PDF Files</h3>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Drag and drop your PDF here, or click to browse
            </p>
            <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); createBlankDocument(); }}>
              <PlusCircle size={16} /> Create Blank Document
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate effective scale
  let calculatedScale = activeDoc.scale;
  if (typeof activeDoc.scale === 'string') {
    const viewerWidth = viewerRef.current ? viewerRef.current.clientWidth - 80 : 800;
    const defaultPageWidth = 595.28;
    if (activeDoc.scale === 'fit-width') {
      calculatedScale = Math.max(0.3, viewerWidth / defaultPageWidth);
    } else if (activeDoc.scale === 'fit-page') {
      const viewerHeight = viewerRef.current ? viewerRef.current.clientHeight - 80 : 800;
      calculatedScale = Math.min(viewerWidth / defaultPageWidth, viewerHeight / 841.89);
    } else {
      calculatedScale = 1.0;
    }
  }

  return (
    <div
      ref={viewerRef}
      className={`viewer-container ${activeTool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
