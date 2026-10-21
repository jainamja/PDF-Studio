import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  Highlighter,
  Underline,
  Strikethrough,
  MessageSquare,
  Square,
  Circle,
  Minus,
  MoveRight,
  PenTool,
  Stamp,
  Trash2
} from 'lucide-react';

export default function RibbonTabComment() {
  const {
    activeDoc,
    activeTool,
    setActiveTool,
    stampType,
    setStampType,
    selectedAnnotationId,
    deleteAnnotation
  } = useDocument();

  const stampOptions = ['APPROVED', 'DRAFT', 'CONFIDENTIAL', 'VOID', 'FINAL', 'EXPIRED'];

  return (
    <>
      {/* Text Markups */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className={`ribbon-btn ${activeTool === 'highlight' ? 'active' : ''}`}
            onClick={() => setActiveTool('highlight')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Highlight text"
          >
            <Highlighter size={18} color="#facc15" />
            <span>Highlight</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'underline' ? 'active' : ''}`}
            onClick={() => setActiveTool('underline')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Underline text"
          >
            <Underline size={18} color="#38bdf8" />
            <span>Underline</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'strikethrough' ? 'active' : ''}`}
            onClick={() => setActiveTool('strikethrough')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Strikethrough text"
          >
            <Strikethrough size={18} color="#f43f5e" />
            <span>Strike</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'sticky' ? 'active' : ''}`}
            onClick={() => setActiveTool('sticky')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Sticky Note (/Text Annotation)"
          >
            <MessageSquare size={18} color="#fbbf24" />
            <span>Note</span>
          </button>
        </div>
        <span className="ribbon-group-title">Text Markup</span>
      </div>

      {/* Shapes & Drawings */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className={`ribbon-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
            onClick={() => setActiveTool('rectangle')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Rectangle"
          >
            <Square size={18} />
            <span>Rectangle</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'ellipse' ? 'active' : ''}`}
            onClick={() => setActiveTool('ellipse')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Ellipse / Oval"
          >
            <Circle size={18} />
            <span>Ellipse</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'line' ? 'active' : ''}`}
            onClick={() => setActiveTool('line')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Line"
          >
            <Minus size={18} />
            <span>Line</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'arrow' ? 'active' : ''}`}
            onClick={() => setActiveTool('arrow')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Arrow"
          >
            <MoveRight size={18} />
            <span>Arrow</span>
          </button>
          <button
            className={`ribbon-btn ${activeTool === 'ink' ? 'active' : ''}`}
            onClick={() => setActiveTool('ink')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Freehand Ink"
          >
            <PenTool size={18} color="#818cf8" />
            <span>Draw</span>
          </button>
        </div>
        <span className="ribbon-group-title">Shapes & Drawing</span>
      </div>

      {/* Stamps */}
      <div className="ribbon-group">
        <div className="ribbon-group-items" style={{ gap: 6 }}>
          <button
            className={`ribbon-btn ${activeTool === 'stamp' ? 'active' : ''}`}
            onClick={() => setActiveTool('stamp')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Stamp"
          >
            <Stamp size={18} color="#34d399" />
            <span>Stamp</span>
          </button>
          <select
            value={stampType}
            onChange={(e) => {
              setStampType(e.target.value);
              setActiveTool('stamp');
            }}
            disabled={!activeDoc || activeDoc.isEncrypted}
            className="input-field"
            style={{ fontSize: 11, height: 32 }}
          >
            {stampOptions.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
        <span className="ribbon-group-title">Stamps</span>
      </div>

      {/* Actions */}
      {selectedAnnotationId && (
        <div className="ribbon-group">
          <div className="ribbon-group-items">
            <button
              className="ribbon-btn"
              onClick={() => deleteAnnotation(selectedAnnotationId)}
              title="Delete Selected (Delete key)"
            >
              <Trash2 size={18} color="#f43f5e" />
              <span>Delete</span>
            </button>
          </div>
          <span className="ribbon-group-title">Selected</span>
        </div>
      )}
    </>
  );
}
