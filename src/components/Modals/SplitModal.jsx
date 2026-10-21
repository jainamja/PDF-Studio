import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { X, Split } from 'lucide-react';
import { splitPdf } from '../../engine/organizeEngine';
import { selectFolder, writeFilesToFolder } from '../../utils/fileUtils';

export default function SplitModal() {
  const {
    activeDoc,
    activeModal,
    setActiveModal,
    showBusy,
    hideBusy,
    addToast
  } = useDocument();

  const [splitType, setSplitType] = useState('each'); // 'each', 'every-n', 'range'
  const [everyN, setEveryN] = useState(2);
  const [ranges, setRanges] = useState('1-2, 3-4');

  if (activeModal !== 'split' || !activeDoc) return null;

  const handleSplit = async () => {
    try {
      showBusy('Splitting document...');
      const baseName = activeDoc.name.replace('.pdf', '');

      let parts;
      if (splitType === 'each') {
        parts = await splitPdf(activeDoc.bytes, 'each', { baseName });
      } else if (splitType === 'every-n') {
        parts = await splitPdf(activeDoc.bytes, 'every-n', { baseName, everyN: parseInt(everyN, 10) || 1 });
      } else {
        const rangeArr = ranges.split(',').map(s => s.trim()).filter(Boolean);
        parts = await splitPdf(activeDoc.bytes, 'range', { baseName, ranges: rangeArr });
      }

      const folderPath = await selectFolder();
      await writeFilesToFolder(folderPath, parts);

      hideBusy();
      setActiveModal(null);
      addToast(`Successfully split document into ${parts.length} files`, 'success');
    } catch (err) {
      hideBusy();
      addToast('Split failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setActiveModal(null)}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Split size={18} color="#a855f7" />
            <span>Split PDF Document</span>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#cbd5e1', fontSize: 12 }}>Split Method</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="splitMethod"
                  checked={splitType === 'each'}
                  onChange={() => setSplitType('each')}
                />
                Extract each page into its own PDF file ({activeDoc.pageCount} files)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="splitMethod"
                  checked={splitType === 'every-n'}
                  onChange={() => setSplitType('every-n')}
                />
                Split every N pages
              </label>

              {splitType === 'every-n' && (
                <div style={{ paddingLeft: 22 }}>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    max={activeDoc.pageCount}
                    value={everyN}
                    onChange={(e) => setEveryN(e.target.value)}
                    style={{ width: 80 }}
                  />
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="splitMethod"
                  checked={splitType === 'range'}
                  onChange={() => setSplitType('range')}
                />
                Split by custom page ranges
              </label>

              {splitType === 'range' && (
                <div style={{ paddingLeft: 22 }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. 1-3, 4-6, 7"
                    value={ranges}
                    onChange={(e) => setRanges(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setActiveModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSplit}>Split & Save</button>
        </div>
      </div>
    </div>
  );
}
