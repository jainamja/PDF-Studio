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
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, [tab]);

  if (activeModal !== 'signature') return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
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
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
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

  const handleApplyCurrentTab = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        addToast('Please draw your signature first', 'warning');
        return;
      }
      handleApplySignature(canvas.toDataURL('image/png'));
    } else if (tab === 'type') {
      // Render typed text into canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      ctx.font = `italic 42px ${typedFont === 'cursive' ? 'Brush Script MT, cursive' : 'Georgia, serif'}`;
      ctx.fillStyle = '#0f172a';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedText, 20, 60);
      handleApplySignature(canvas.toDataURL('image/png'));
    }
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
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #1e293b', paddingBottom: 8 }}>
            <button
              className={`btn ${tab === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setTab('draw')}
            >
              <Pen size={14} /> Draw
            </button>
            <button
              className={`btn ${tab === 'type' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setTab('type')}
            >
              <Type size={14} /> Type
            </button>
            <button
              className={`btn ${tab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setTab('upload')}
            >
              <Upload size={14} /> Upload Image
            </button>
          </div>

          {/* Draw Tab */}
          {tab === 'draw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#ffffff', borderRadius: 6, border: '1px solid #334155', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={160}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ display: 'block', cursor: 'crosshair', width: '100%', height: 160 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                    name="sigFont"
                    checked={typedFont === 'cursive'}
                    onChange={() => setTypedFont('cursive')}
                  />
                  Script style
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
                  <input
                    type="radio"
                    name="sigFont"
                    checked={typedFont === 'serif'}
                    onChange={() => setTypedFont('serif')}
                  />
                  Classic serif
                </label>
              </div>
              <div style={{
                background: '#ffffff',
                color: '#0f172a',
                padding: '24px',
                borderRadius: 6,
                textAlign: 'center',
                fontFamily: typedFont === 'cursive' ? 'Brush Script MT, cursive' : 'Georgia, serif',
                fontSize: 34,
                fontStyle: 'italic',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
              }}>
                {typedText || 'Signature'}
              </div>
            </div>
          )}

          {/* Upload Tab */}
          {tab === 'upload' && (
            <div style={{
              border: '2px dashed #334155',
              borderRadius: 8,
              padding: 24,
              textAlign: 'center',
              backgroundColor: '#0f172a'
            }}>
              <Upload size={32} color="#6366f1" style={{ marginBottom: 8 }} />
              <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                Upload an image of your signature (PNG or JPG with transparent/white background)
              </p>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleUploadImage}
                style={{ fontSize: 12 }}
              />
            </div>
          )}

          {/* Saved Signatures */}
          {savedSignatures.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                Saved Signatures (click to insert):
              </span>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {savedSignatures.map((sigUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleApplySignature(sigUrl)}
                    style={{
                      background: '#fff',
                      padding: 4,
                      borderRadius: 4,
                      cursor: 'pointer',
                      border: '1px solid #cbd5e1',
                      flexShrink: 0
                    }}
                  >
                    <img src={sigUrl} alt="saved sig" style={{ height: 36, display: 'block' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          {tab !== 'upload' && (
            <button className="btn btn-primary" onClick={handleApplyCurrentTab}>
              Insert Signature
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
