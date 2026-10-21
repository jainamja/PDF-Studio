# PDF Studio

**PDF Studio** is an original desktop, mobile, and web PDF editor built with Electron, Capacitor, React 18, Vite, and pure PDF manipulation engines. It features dark and light themes, responsive touch-first navigation, and a non-destructive overlay architecture.

🌐 **Live Web App on Vercel**: [https://pdf-topaz-chi.vercel.app](https://pdf-topaz-chi.vercel.app)  
📦 **GitHub Repository**: [https://github.com/jainamja/PDF-Studio](https://github.com/jainamja/PDF-Studio)

---

## Unified Cross-Platform Architecture

PDF Studio shares **100% of its PDF engines and state store** across Desktop (Electron), Mobile (Capacitor for Android & iOS), and Plain Browser / PWA:

```
                    ┌──────────────────────────┐
                    │      PDF Studio UI       │
                    │   (React 18 + Plain CSS) │
                    └────────────┬─────────────┘
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
     Desktop Shell         Tablet Layout         Mobile Shell
    (Ribbon + Tabs)     (Compact Ribbon)     (App Bar + Bottom Bar)
           │                     │                     │
           └─────────────────────┼─────────────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │  Platform I/O Adapter │
                     │    (src/lib/io.js)    │
                     └───────────┬───────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  Electron Desktop       Capacitor Native         Web / PWA
  (window.electronAPI)   (Android & iOS Plugins)  (HTML5 Blob / Input)
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                     ┌───────────────────────┐
                     │ Shared PDF Engine     │
                     │ (pdf-lib, pdfjs-dist) │
                     │   100% Shared Logic   │
                     └───────────────────────┘
```

---

## Tech Stack

- **Desktop Framework**: Electron (context-isolated, secure contextBridge, custom `app://` protocol)
- **Mobile Framework**: Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/camera`, `@capawesome/capacitor-file-picker`)
- **UI Framework**: React 18 + Vite
- **PDF Rendering & Text Layer**: `pdfjs-dist` (with offline standard fonts, cmaps, and web worker)
- **PDF Manipulation Engine**: `pdf-lib` (pure JS, runs in Node, browser, and mobile, no UI imports)
- **Optical Character Recognition (OCR)**: `tesseract.js`
- **Icons**: `lucide-react`
- **Styling**: Plain CSS with Dark and Light theme support, safe-area insets (`env(safe-area-inset-*)`)

---

## Architectural Principles

1. **Platform Abstraction Layer (`src/lib/io.js`)**:
   - Exposes unified async methods: `openPdfs`, `openImages`, `saveBytes`, `share`, `scanCamera`, and `registerAppOpenListener`.
   - On **Electron**: Uses native IPC dialogs (`openFileDialog`, `saveFileDialog`).
   - On **Capacitor**: Uses `@capawesome/capacitor-file-picker`, `@capacitor/filesystem`, `@capacitor/share`, and `@capacitor/camera`.
   - On **Browser / PWA**: Uses `<input type="file">`, Blob URLs, and Web Share API.
2. **Native Mobile Handlers**:
   - **Android**: Registered `intent-filter` for `VIEW` and `SEND` with `application/pdf` in `AndroidManifest.xml` so PDFs from Files, Gmail, WhatsApp, and Drive open directly in PDF Studio.
   - **iOS**: Configured `CFBundleDocumentTypes` with `com.adobe.pdf` and `UIFileSharingEnabled` in `Info.plist`.
3. **Responsive Touch-First UI**:
   - Detects screen width and `(pointer: coarse)`. Below 800px, automatically renders:
     - **Top App Bar**: Document title, undo/redo, share button, theme toggle, and overflow menu.
     - **Bottom Toolbar**: Primary modes (`View`, `Annotate`, `Edit`, `Sign`, `Pages`, `Scan`) with contextual sub-tool pills.
     - **Bottom Sheet**: Swipeable properties sheet for colors, stroke width, opacity, and typography.
     - **Slide-Over Drawers**: For Pages/Thumbnails, Bookmarks/Outline, Find/Search, and Notes.
     - **Home Slate**: Empty state with recent files, "Open or Drop PDF", and "Scan to PDF".
4. **Touch & Stylus Gestures**:
   - **Pinch-to-zoom**: Centers zoom calculations around the pinch midpoint.
   - **Two-finger pan**: Smooth two-finger viewport navigation.
   - **Double-tap**: Toggles between `Fit Width` and 100% zoom.
   - **Stylus Pressure**: Captures `e.pressure` on `pointerdown`/`pointermove` to dynamically vary ink stroke thickness.
   - **Palm Rejection**: Discards concurrent touch inputs while an active stylus (`e.pointerType === 'pen'`) is drawing.
   - **Hit Targets**: Minimum 44px buttons and 28px selection resize handles on touch devices.
5. **Mobile Memory & Performance Optimizations**:
   - **Canvas Pixel Cap**: Enforces an 8M pixel cap per canvas to avoid mobile GPU out-of-memory crashes.
   - **DPR Cap**: Limits `devicePixelRatio` to 2 on high-DPI retina screens.
   - **Virtualized Rendering**: Renders only the visible page plus one neighbor (`currentPage ± 1`); off-screen canvas buffers are cleared (`width = 0, height = 0`) to immediately free memory.
   - **Memory-Safe Redaction, Compression, and OCR**: Runs page-by-page at 1.25x scale on mobile devices with canvas cleanup after each page.
   - **Undo History**: Kept shallower on mobile (15 snapshots) vs. 30 on desktop.
   - **Large File Warning**: Alerts user when opening PDFs larger than ~100MB.

---

## Feature Overview

### 1. Viewing
- **Continuous Scrolling & Virtualized Rendering**: Lazy rendering via `IntersectionObserver` with automatic offscreen canvas cleanup.
- **Zoom**: 25% to 500%, Fit Width, Fit Page, Ctrl+Wheel, and Touch Pinch-to-Zoom.
- **Sidebar & Drawers**: Thumbnails, Bookmarks & Outline, Text Search with highlights, and Comments list.
- **Hand Pan Tool & Text Selection**: Multi-finger pan and copy.

### 2. Editing
- **Edit Existing Text**: Click a line, cover it, and replace it with matching standard fonts.
- **Add Text Boxes**: Font size, color, bold/italic, alignment, and fill.
- **Add Images**: Insert, reposition, and resize images.
- **Whiteout Tool**: Block out sections cleanly.
- **Watermark**: Text or image watermarks with opacity, rotation, tiled options, and page ranges.
- **Header & Footer**: Insert headers, footers, and page numbers with dynamic tokens (`{n}`, `{total}`, `{date}`, `{name}`).
- **Crop**: Crop page margins.

### 3. Comment & Markup
- **Text Markup**: Highlight, Underline, and Strikethrough from text selection.
- **Sticky Notes**: PDF `/Text` annotations that conform to ISO 32000-1 standards.
- **Shapes & Ink**: Rectangle, Ellipse, Line, Arrow, and freehand Ink pen with stylus pressure.
- **Preset Stamps**: APPROVED, DRAFT, CONFIDENTIAL, VOID, FINAL, EXPIRED.
- **Properties Sheet**: Adjust color palette, stroke width, fill, opacity, and font attributes.

### 4. Forms and Signing
- **Fill AcroForms**: Text fields, checkboxes, dropdowns, and radio buttons with HTML overlays.
- **Guided "Next Field" Flow**: Floating mobile control to navigate through form fields step-by-step and smoothly scroll them into view.
- **Create Form Fields**: Add text fields and checkboxes to any page.
- **Flatten Forms**: Permanently convert form fields into page graphics.
- **Signature Dialog**:
  - *Finger & Stylus Draw*: Touch-optimized canvas with pointer capture.
  - *Type*: Script and serif font generators.
  - *Upload*: Import signature image files.
  - *Saved Signatures*: Stores signatures in `localStorage` for reuse.

### 5. Mobile Scan to PDF
- **Camera Capture & Gallery Import**: Capture multi-page documents via camera or import photos.
- **Filters**: Original, Grayscale, and Black & White contrast modes.
- **Multi-page Compilation**: Compile multiple scans into a single PDF, with optional instant OCR.

### 6. Organize
- **Visual Thumbnail Touch Grid**: Tap to select, long-press to reorder.
- **Contextual Action Bar**: Rotate (90° CW), Duplicate, Delete, and **Extract** selected pages.
- **Document Operations**: Merge multiple PDFs with custom ordering, Split by intervals or ranges.

### 7. Protect and Tools
- **True Redaction**: Burns redaction boxes into rasterized images, irreversibly destroying underlying text, vector paths, and metadata.
- **Metadata Editor**: View and update Title, Author, Subject, and Keywords.
- **Compression**: Lossless structure optimization + lossy raster compression.
- **OCR (Optical Character Recognition)**: Powered by `tesseract.js` with language selection (English, Spanish, French, German, Italian, Portuguese, Hindi, etc.) that burns an invisible text layer.

---

## Build & Project Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+
- For Android builds: **Android Studio** with Android SDK (API 33+)
- For iOS builds: **macOS with Xcode 14+** and CocoaPods / Swift Package Manager (Apple Developer account required for physical devices and App Store distribution).

### 2. Development Setup
```bash
# Install dependencies
npm install

# Start Electron desktop dev environment
npm start

# Or run Vite web dev server
npm run dev
```

### 3. Run Engine Self-Tests
Verify geometry transforms (0°/90°/180°/270°), WinAnsi text sanitization, annotation burning, AcroForms, and document organization:
```bash
npm test
```

### 4. Build Web & Sync to Mobile
```bash
# Compile web assets with Vite
npm run build

# Synchronize web bundle and native plugins to Android and iOS projects
npx cap sync
```

### 5. Android Build (Android Studio)
```bash
# Open Android project in Android Studio
npx cap open android
```
- In Android Studio, connect an Android device or launch an emulator.
- Click **Run** (`Shift + F10`) or select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the `.apk`.

### 6. iOS Build (Xcode - macOS Only)
> **Note**: Building for iOS requires a Mac with Xcode and an active Apple Developer account to sign and deploy to physical devices or TestFlight.
```bash
# Open iOS workspace in Xcode
npx cap open ios
```
- In Xcode, select your development team under **Signing & Capabilities**.
- Select target device (iPhone / iPad or Simulator) and click **Run** (`Cmd + R`).

### 7. Desktop Installer (Electron)
```bash
# Build desktop installer (.exe on Windows, .dmg on macOS, .AppImage on Linux)
npm run dist
```

---

## Known Limitations

1. **Encrypted / Password-Protected PDFs**:
   `pdf-lib` does not support modifying encrypted documents. PDF Studio detects encrypted files upon opening, loads them in read-only mode, and displays a warning to prevent document corruption.
2. **Standard PDF Fonts Character Support**:
   PDF Standard 14 fonts only encode WinAnsi (Windows-1252 / Latin-1). Unsupported characters (such as emojis or non-Latin scripts) are sanitized to `?` by `src/engine/textSanitizer.js` to avoid runtime font-encoding exceptions.
3. **Tesseract.js OCR First-Time Download**:
   On the first run of OCR for a particular language, Tesseract downloads language traineddata files over the internet, after which they are cached locally for offline use.
