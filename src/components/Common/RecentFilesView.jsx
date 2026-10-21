import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import { FileUp, Camera, Plus, Clock, FileText } from 'lucide-react';
import { openPdfFiles } from '../../utils/fileUtils';
import ioAdapter from '../../lib/io';

export default function RecentFilesView({ isDragOver, onDragOver, onDragLeave, onDrop }) {
  const {
    loadPdfDocument,
    createBlankDocument,
    setActiveModal,
    recentFiles
  } = useDocument();

  const handleOpenFiles = async () => {
    const files = await openPdfFiles();
    for (const f of files) {
      await loadPdfDocument(f.name, f.bytes, f.path);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      className="welcome-screen"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={`drop-zone ${isDragOver ? 'drag-active' : ''}`} onClick={handleOpenFiles}>
        <FileUp size={48} color="#6366f1" style={{ marginBottom: 12 }} />
        <h2 style={{ fontSize: 18, marginBottom: 6, color: 'var(--text-main)', fontWeight: 700 }}>
          Open or Drop PDF
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
          Tap to open from device, iCloud, Google Drive, or drop files here
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={(e) => { e.stopPropagation(); setActiveModal('scan-to-pdf'); }}
          >
            <Camera size={15} /> Scan to PDF
          </button>
          <button
            className="btn btn-secondary"
            onClick={(e) => { e.stopPropagation(); createBlankDocument(); }}
          >
            <Plus size={15} /> New Blank
          </button>
        </div>
      </div>

      {/* Recent Files List */}
      {recentFiles && recentFiles.length > 0 && (
        <div style={{ width: '100%', maxWidth: 520, marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--text-muted)' }}>
            <Clock size={14} />
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Recent Documents
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentFiles.map((rf, idx) => (
              <div
                key={idx}
                className="recent-file-card"
                onClick={handleOpenFiles}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={18} color="#6366f1" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: 'left' }}>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {rf.name}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                      {rf.pageCount ? `${rf.pageCount} page(s) • ` : ''}
                      {formatSize(rf.size)} {rf.lastOpened ? `• ${formatDate(rf.lastOpened)}` : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
