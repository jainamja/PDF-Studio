import React, { useEffect } from 'react';
import { DocumentProvider, useDocument } from './state/DocumentContext';
import { useDevice } from './hooks/useDevice';
import ioAdapter from './lib/io';

// Desktop Components
import TabBar from './components/TabBar/TabBar';
import Ribbon from './components/Ribbon/Ribbon';
import Sidebar from './components/Sidebar/Sidebar';
import Viewer from './components/Viewer/Viewer';
import StatusBar from './components/Common/StatusBar';
import PropertiesPanel from './components/Common/PropertiesPanel';
import BusyOverlay from './components/Common/BusyOverlay';
import ToastContainer from './components/Common/ToastContainer';
import RecentFilesView from './components/Common/RecentFilesView';

// Mobile Components
import MobileTopAppBar from './components/Mobile/MobileTopAppBar';
import MobileBottomBar from './components/Mobile/MobileBottomBar';
import MobileBottomSheet from './components/Mobile/MobileBottomSheet';
import MobileDrawer from './components/Mobile/MobileDrawer';

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
import ScanModal from './components/Modals/ScanModal';

function AppContent() {
  const { activeDoc, loadPdfDocument } = useDocument();
  const { isMobile } = useDevice();

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

  // Listen to Capacitor open with / share intent
  useEffect(() => {
    const unregisterPromise = ioAdapter.registerAppOpenListener(async (file) => {
      if (file && file.bytes) {
        await loadPdfDocument(file.name, file.bytes, file.path);
      }
    });

    return () => {
      unregisterPromise.then(unreg => {
        if (typeof unreg === 'function') unreg();
      });
    };
  }, [loadPdfDocument]);

  return (
    <div className={`app-container ${isMobile ? 'mobile-mode' : 'desktop-mode'}`}>
      {isMobile ? (
        <>
          {/* Mobile Shell */}
          <MobileTopAppBar />

          <main className="workspace-container mobile-workspace" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {activeDoc ? <Viewer /> : <RecentFilesView />}
          </main>

          <MobileBottomBar />
          <MobileBottomSheet />
          <MobileDrawer />
        </>
      ) : (
        <>
          {/* Desktop / Tablet Shell */}
          <header className="app-header">
            <TabBar />
            <Ribbon />
          </header>

          <main className="workspace-container">
            <Sidebar />
            <Viewer />
            <PropertiesPanel />
          </main>

          <StatusBar />
        </>
      )}

      {/* Shared Modals & Overlays across all platforms */}
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
      <ScanModal />

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
