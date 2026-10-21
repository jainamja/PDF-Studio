import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Combine, Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { mergePdfs } from '../../engine/organizeEngine';
import { openPdfFiles } from '../../utils/fileUtils';

export default function MergeModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    loadPdfDocument,
    showBusy,
    hideBusy,
    addToast
  } = useDocument();

  const [filesToMerge, setFilesToMerge] = useState(() => {
    return activeDoc ? [{ name: activeDoc.name, bytes: activeDoc.bytes }] : [];
  });

  if (activeModal !== 'merge') return null;

  const handleAddFiles = async () => {
    const opened = await openPdfFiles();
    if (opened.length > 0) {
      setFilesToMerge(prev => [...prev, ...opened.map(f => ({ name: f.name, bytes: f.bytes }))]);
    }
  };

  const handleMove = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= filesToMerge.length) return;
    const copy = [...filesToMerge];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    setFilesToMerge(copy);
  };

  const handleRemove = (index) => {
    setFilesToMerge(prev => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (filesToMerge.length < 2) {
      addToast('Please add at least 2 PDF documents to merge', 'warning');
      return;
    }

    try {
      showBusy('Merging documents...');
      const mergedBytes = await mergePdfs(filesToMerge.map(f => f.bytes));
      await loadPdfDocument('Merged_Document.pdf', mergedBytes, null);
      hideBusy();
      setActiveModal(null);
      addToast('Documents merged successfully into a new tab', 'success');
    } catch (err) {
      hideBusy();
      addToast('Merge failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Combine size={18} color="#38bdf8" />
            <span>Merge PDF Documents</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Arrange documents in the desired merge order:
            </span>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleAddFiles}>
              <Plus size={14} /> Add Files
            </button>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            maxHeight: 280,
            overflowY: 'auto',
            background: '#0f172a',
            padding: 8,
            borderRadius: 6,
            minHeight: 120
          }}>
            {filesToMerge.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', padding: 30, fontSize: 12 }}>
                Click "+ Add Files" to select PDFs to merge
              </div>
            ) : (
              filesToMerge.map((f, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    backgroundColor: '#172033',
                    border: '1px solid #1e293b',
                    borderRadius: 6,
                    fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>{idx + 1}.</span>
                    <span style={{ color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === filesToMerge.length - 1}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => handleRemove(idx)}
                      style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 2 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleMerge} disabled={filesToMerge.length < 2}>
            Merge Documents
          </button>
        </div>
      </div>
    </div>
  );
}
