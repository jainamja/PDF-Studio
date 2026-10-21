import React from 'react';
import { useDocument } from '../../state/DocumentContext';
import {
  FileText,
  CheckSquare,
  Layers,
  PenTool,
  Plus
} from 'lucide-react';
import { flattenForm, createFormField } from '../../engine/formEngine';

export default function RibbonTabForms() {
  const {
    activeDoc,
    setActiveModal,
    updateDocumentBytes,
    addToast
  } = useDocument();

  const handleCreateField = async (type) => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    try {
      const fieldName = `${type === 'checkbox' ? 'Check' : 'Text'}_${Date.now().toString().slice(-4)}`;
      const newBytes = await createFormField(activeDoc.bytes, {
        name: fieldName,
        type,
        pageIndex: activeDoc.currentPage - 1,
        rect: {
          x: 60,
          y: 80,
          width: type === 'checkbox' ? 20 : 160,
          height: type === 'checkbox' ? 20 : 26
        }
      });
      await updateDocumentBytes(activeDoc.id, newBytes, true);
      addToast(`Added ${type} form field`, 'success');
    } catch (e) {
      addToast('Error creating form field: ' + e.message, 'error');
    }
  };

  const handleFlatten = async () => {
    if (!activeDoc || activeDoc.isEncrypted) return;
    try {
      const flattened = await flattenForm(activeDoc.bytes);
      await updateDocumentBytes(activeDoc.id, flattened, true);
      addToast('AcroForm fields flattened into page graphics', 'success');
    } catch (e) {
      addToast('Flatten error: ' + e.message, 'error');
    }
  };

  return (
    <>
      {/* Form Fields Creation */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => handleCreateField('text')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Create new text field on current page"
          >
            <FileText size={18} color="#38bdf8" />
            <span>Text Field</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={() => handleCreateField('checkbox')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Create new checkbox on current page"
          >
            <CheckSquare size={18} color="#34d399" />
            <span>Checkbox</span>
          </button>
          <button
            className="ribbon-btn"
            onClick={handleFlatten}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Flatten forms (convert interactive fields to permanent graphics)"
          >
            <Layers size={18} color="#f59e0b" />
            <span>Flatten</span>
          </button>
        </div>
        <span className="ribbon-group-title">Form Design</span>
      </div>

      {/* Signature */}
      <div className="ribbon-group">
        <div className="ribbon-group-items">
          <button
            className="ribbon-btn"
            onClick={() => setActiveModal('signature')}
            disabled={!activeDoc || activeDoc.isEncrypted}
            title="Create or insert signature (Draw, Type, Upload)"
          >
            <PenTool size={18} color="#a855f7" />
            <span>Sign</span>
          </button>
        </div>
        <span className="ribbon-group-title">Signatures</span>
      </div>
    </>
  );
}
