import React, { useEffect } from 'react';
import { DocumentProvider, useDocument } from './state/DocumentContext';
import TabBar from './components/TabBar/TabBar';
import Ribbon from './components/Ribbon/Ribbon';
import Sidebar from './components/Sidebar/Sidebar';
import Viewer from './components/Viewer/Viewer';
import StatusBar from './components/Common/StatusBar';
import PropertiesPanel from './components/Common/PropertiesPanel';
import BusyOverlay from './components/Common/BusyOverlay';
import ToastContainer from './components/Common/ToastContainer';

// Modals
import SignatureModal from './components/Modals/SignatureModal';
import WatermarkModal from './components/Modals/WatermarkModal';
import HeaderFooterModal from './components/Modals/HeaderFooterModal';
import CropModal from './components/Modals/CropModal';
import MetadataModal from './components/Modals/MetadataModal';
import CompressModal from './components/Modals/CompressModal';
import OCRModal from './components/Modals/OCRModal';
import SplitModal from './components/Modals/SplitModal';
import MergeModal from './components/Modals/MergeModal';
import OrganizeGridModal from './components/Modals/OrganizeGridModal';
import ImagesToPdfModal from './components/Modals/ImagesToPdfModal';
import UnsavedPromptModal from './components/Modals/UnsavedPromptModal';
import RedactionConfirmModal from './components/Modals/RedactionConfirmModal';

function AppContent() {
  const { loadPdfDocument } = useDocument();

  // Listen to file drop events from Electron preload if available
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onFileDrop) {
      const unsubscribe = window.electronAPI.onFileDrop(async (filePath) => {
        const readRes = await window.electronAPI.readFile(filePath);
        if (readRes.success) {
          const fileName = filePath.split(/[/\\]/).pop();
          loadPdfDocument(fileName, new Uint8Array(readRes.data), filePath);
        }
      });
      return unsubscribe;
    }
  }, [loadPdfDocument]);

  return (
    <div className="app-container">
      {/* Header & Ribbon */}
      <header className="app-header">
        <TabBar />
        <Ribbon />
      </header>

      {/* Main Workspace */}
      <main className="workspace-container">
        <Sidebar />
        <Viewer />
        <PropertiesPanel />
      </main>

      {/* Status Bar */}
      <StatusBar />

      {/* Modals & Overlays */}
      <SignatureModal />
      <WatermarkModal />
      <HeaderFooterModal />
      <CropModal />
      <MetadataModal />
      <CompressModal />
      <OCRModal />
      <SplitModal />
      <MergeModal />
      <OrganizeGridModal />
      <ImagesToPdfModal />
      <UnsavedPromptModal />
      <RedactionConfirmModal />

      <BusyOverlay />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <DocumentProvider>
      <AppContent />
    </DocumentProvider>
  );
}
