import React, { useState, useRef, useEffect } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Pen, Type, Upload, Trash2, Check } from 'lucide-react';

export default function SignatureModal() {
  const { activeModal, setActiveModal, addAnnotation, addToast } = useDocument();

  const [tab, setTab] = useState('draw'); // 'draw', 'type', 'upload'
  const [typedText, setTypedText] = useState('John Doe');
  const [typedFont, setTypedFont] = useState('cursive');
  const [savedSignatures, setSavedSignatures] = useState([]);

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Load saved signatures from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pdf_studio_saved_signatures');
      if (stored) {
        setSavedSignatures(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read saved signatures:', e);
    }
  }, []);

  const saveSignatureToStorage = (dataUrl) => {
    try {
      const updated = [dataUrl, ...savedSignatures.slice(0, 4)];
      setSavedSignatures(updated);
      localStorage.setItem('pdf_studio_saved_signatures', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save signature:', e);
    }
  };

  // Drawing Canvas setup
  useEffect(() => {
    if (tab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, [tab]);

  if (activeModal !== 'signature') return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try { canvas.setPointerCapture(e.pointerId); } catch {}

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = (e.pressure && e.pressure > 0) ? Math.max(2, e.pressure * 5) : 3;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (e.pressure && e.pressure > 0) {
      ctx.lineWidth = Math.max(1.8, e.pressure * 5);
    }
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (isDrawing && canvasRef.current) {
      try { canvasRef.current.releasePointerCapture(e.pointerId); } catch {}
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const handleApplySignature = (dataUrl) => {
    addAnnotation({
      type: 'signature',
      dataUrl,
      format: 'png',
      x: 100,
      y: 150,
      width: 160,
      height: 60
    });
    saveSignatureToStorage(dataUrl);
    setActiveModal(null);
    addToast('Signature placed on document', 'success');
  };

  const handleApplyDrawn = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      addToast('Please draw your signature first', 'warning');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    handleApplySignature(dataUrl);
  };

  const handleApplyTyped = () => {
    if (!typedText.trim()) {
      addToast('Please enter text for your signature', 'warning');
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 120;
    const ctx = tempCanvas.getContext('2d');

    ctx.font = typedFont === 'cursive'
      ? 'italic 36px "Brush Script MT", "Caveat", "Dancing Script", cursive'
      : typedFont === 'serif'
      ? 'italic 32px "Times New Roman", serif'
      : 'bold 30px sans-serif';

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedText, 200, 60);

    const dataUrl = tempCanvas.toDataURL('image/png');
    handleApplySignature(dataUrl);
  };

  const handleUploadImage = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        handleApplySignature(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span>Create & Insert Signature</span>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
            <button
              className={`btn ${tab === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => setTab('draw')}
            >
              <Pen size={14} /> Draw
            </button>
            <button
              className={`btn ${tab === 'type' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => setTab('type')}
            >
              <Type size={14} /> Type
            </button>
            <button
              className={`btn ${tab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 14px', fontSize: 13 }}
              onClick={() => setTab('upload')}
            >
              <Upload size={14} /> Upload Image
            </button>
          </div>

          {/* Draw Tab */}
          {tab === 'draw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #334155', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={160}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                  style={{ display: 'block', cursor: 'crosshair', width: '100%', height: 160, touchAction: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sign with finger, stylus, or mouse</span>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={clearCanvas}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Type Tab */}
          {tab === 'type' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                className="input-field"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your name..."
                style={{ fontSize: 14 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="radio"
                    name="font"
                    checked={typedFont === 'cursive'}
                    onChange={() => setTypedFont('cursive')}
                  />
                  Cursive
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="radio"
                    name="font"
                    checked={typedFont === 'serif'}
                    onChange={() => setTypedFont('serif')}
                  />
                  Elegant Serif
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="radio"
                    name="font"
                    checked={typedFont === 'sans'}
                    onChange={() => setTypedFont('sans')}
                  />
                  Modern Sans
                </label>
              </div>

              {/* Preview */}
              <div style={{
                background: '#ffffff',
                color: '#0f172a',
                height: 100,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontFamily: typedFont === 'cursive' ? 'cursive' : typedFont === 'serif' ? 'serif' : 'sans-serif',
                fontStyle: typedFont !== 'sans' ? 'italic' : 'normal'
              }}>
                {typedText || 'Signature Preview'}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {tab === 'upload' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              border: '2px dashed #334155',
              borderRadius: 8
            }}>
              <input
                type="file"
                accept="image/png, image/jpeg"
                id="sig-upload"
                style={{ display: 'none' }}
                onChange={handleUploadImage}
              />
              <label htmlFor="sig-upload" className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={14} /> Choose Signature Image
              </label>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                PNG (with transparent background) or JPEG
              </span>
            </div>
          )}

          {/* Saved Signatures */}
          {savedSignatures.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Saved Signatures (Tap to reuse)
              </span>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {savedSignatures.map((sig, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleApplySignature(sig)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #334155',
                      borderRadius: 4,
                      padding: 4,
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <img src={sig} alt="saved signature" style={{ height: 40, display: 'block' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          {tab === 'draw' && (
            <button className="btn btn-primary" onClick={handleApplyDrawn}>
              Apply Drawn Signature
            </button>
          )}
          {tab === 'type' && (
            <button className="btn btn-primary" onClick={handleApplyTyped}>
              Apply Typed Signature
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
