# PDF Studio

**PDF Studio** is an original desktop PDF editor built with Electron, React 18, Vite, and pure PDF manipulation engines. It features a dark theme, ribbon-style navigation, and non-destructive overlay architecture.

---

## Tech Stack

- **Desktop Framework**: Electron (context-isolated, secure contextBridge, custom `app://` protocol)
- **UI Framework**: React 18 + Vite
- **PDF Rendering & Text Layer**: `pdfjs-dist` (with offline standard fonts, cmaps, and web worker)
- **PDF Manipulation Engine**: `pdf-lib` (pure JS, runs in Node and browser, no UI imports)
- **Optical Character Recognition (OCR)**: `tesseract.js`
- **Icons**: `lucide-react`
- **Styling**: CSS with an original dark theme

---

## Architectural Principles

1. **Secure Electron Main Process**:
   - `contextIsolation: true`, `nodeIntegration: false`.
   - File dialogues (`openFileDialog`, `saveFileDialog`, `selectFolderDialog`), disk I/O, and printing are exposed securely through `window.electronAPI` via `electron/preload.cjs`.
   - Built app is served over the custom `app://` protocol (`app://bundle/index.html`) rather than `file://`, ensuring Web Workers, WASM, and fetch requests work.
2. **View to PDF Geometry Coordinate Helper**:
   - Located in `src/engine/geometry.js`.
   - Handles transformations between top-left View space and bottom-left PDF User space, taking into account `CropBox ∩ MediaBox` offsets and all 4 rotation states: **0°, 90°, 180°, and 270°**.
   - Used for all drawing operations, text placements, shape burns, and AcroForm field alignments.
3. **Pure PDF Engine with Node Self-Tests**:
   - The engine modules (`src/engine/geometry.js`, `src/engine/pdfEngine.js`, `src/engine/formEngine.js`, `src/engine/organizeEngine.js`, `src/engine/convertEngine.js`) have **zero UI dependencies**.
   - Run `node scripts/selftest.mjs` (or `npm test`) to execute automated unit tests checking rotations 0/90/180/270, WinAnsi character sanitization, form extraction, and organize operations.
4. **Non-Destructive Overlays & Snapshot Undo/Redo**:
   - Pending edits (text additions, whiteouts, highlights, shapes, stamps, sticky notes, signatures) are kept as an interactive overlay.
   - Undo/Redo maintains full snapshots of `{ bytes, annotations, formValues }`.
   - Edits are committed into the PDF structure upon Save, Save As, Print, Export, or prior to any destructive page operation.
5. **WinAnsi Character Sanitizer**:
   - Standard PDF fonts only encode WinAnsi (Windows-1252 / Latin-1). Characters outside this range (emojis, complex scripts) are sanitized to prevent crashes.

---

## Feature Overview

### 1. Viewing
- **Continuous Scrolling**: Lazy page rendering via `IntersectionObserver` to keep memory consumption low.
- **Zoom**: 25% to 500%, Fit Width, Fit Page, and `Ctrl + Wheel` zooming.
- **Navigation**: Next/previous page, jump-to-page input, and thumbnails.
- **Sidebar Panels**:
  - *Thumbnails*: Visual page preview with quick rotate, duplicate, and delete shortcuts.
  - *Bookmarks & Outline*: Interactive outline tree.
  - *Search / Find*: Full document text search with match case toggle and match highlights.
  - *Comments List*: Overview of all notes, markups, and annotations with click-to-jump.
- **Tools**: Hand pan tool, text selection & copy, and native document printing.

### 2. Editing
- **Edit Existing Text**: Select or click a line, cover it, and replace it with matching font and size.
- **Add Text Boxes**: Font size, color, bold, italic, and background fill.
- **Add Images**: Insert, reposition, and resize PNG/JPG images.
- **Whiteout Tool**: Cover content with background rectangles.
- **Watermark**: Text or image watermarks with opacity, rotation, tiled options, and page ranges.
- **Header & Footer**: Insert headers, footers, and page numbers with dynamic tokens (`{n}`, `{total}`, `{date}`, `{name}`).
- **Crop**: Crop page margins (top, bottom, left, right in points).

### 3. Comment & Markup
- **Text Markup**: Highlight, Underline, and Strikethrough from text selection.
- **Sticky Notes**: PDF `/Text` annotations that conform to ISO 32000-1 standards.
- **Shapes & Ink**: Rectangle, Ellipse, Line, Arrow, and freehand Ink pen.
- **Preset Stamps**: APPROVED, DRAFT, CONFIDENTIAL, VOID, FINAL, EXPIRED.
- **Properties Panel**: Floating panel to adjust color, stroke width, fill, opacity, and font attributes.

### 4. Forms and Signing
- **Fill AcroForms**: Fill text fields, checkboxes, dropdowns, and radio buttons with HTML overlays.
- **Missing `/P` Resolution**: Resolves widget annotations that lack `/P` page references by mapping them through page annotation arrays.
- **Create Form Fields**: Add text fields and checkboxes to any page.
- **Flatten Forms**: Permanently convert form fields into page graphics.
- **Signature Dialog**:
  - *Draw*: Draw your signature on a canvas.
  - *Type*: Generate signatures in script or classic serif styles.
  - *Upload*: Import signature image files.
  - *Saved Signatures*: Stores signatures in `localStorage` for reuse.

### 5. Organize
- **Visual Thumbnail Grid**: Multi-select pages with drag-and-drop reordering.
- **Page Operations**: Rotate (90° CW, 90° CCW, 180°), Duplicate, Delete, and Extract pages.
- **Insert Pages**: Insert blank pages (A4) or insert pages from another PDF.
- **Merge**: Combine multiple PDF documents with custom ordering.
- **Split**: Split every N pages, extract each page, or split by custom page ranges into a target folder or ZIP.

### 6. Protect and Tools
- **True Redaction**: Burns redaction boxes into rasterized images at 2x resolution, destroying underlying text, vector paths, and metadata.
- **Metadata Editor**: View and update Title, Author, Subject, and Keywords.
- **Compression**:
  - *Lossless*: Removes unreferenced objects and enables object stream compression.
  - *Lossy Raster*: Configurable DPI slider (72–200 DPI) and JPEG quality slider (30%–90%).
- **OCR (Optical Character Recognition)**:
  - Powered by `tesseract.js` with language selection (English, Spanish, French, German, Italian, Portuguese).
  - Burns an invisible text layer to make scanned documents searchable and selectable.

### 7. Conversion
- **Export Pages**: Export all pages as high-resolution PNG or JPG images (saved to a folder or downloaded as a ZIP).
- **Export Text**: Extract text into a `.txt` file.
- **Images to PDF**: Convert multiple images (PNG/JPG) into a PDF with A4 or Fit-to-image layouts.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + O` | Open PDF Document |
| `Ctrl + S` | Save Document |
| `Ctrl + Shift + S` | Save As Document |
| `Ctrl + Z` | Undo edit / annotation |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo edit / annotation |
| `Ctrl + F` | Open Find / Search sidebar |
| `Ctrl + P` | Print Document |
| `Ctrl + Wheel` | Zoom in / Zoom out |
| `Delete` / `Backspace` | Delete selected annotation |
| `Escape` | Deselect active object / Cancel tool |
| `Arrow Keys` | Nudge selected annotation by 2px (`Shift + Arrow`: 10px) |

---

## Setup & Running

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run in Development Mode
To launch the full Electron desktop app with Vite dev server:
```bash
npm start
```
Or to run the Vite web preview server:
```bash
npm run dev
```

### 3. Run Engine Self-Tests
Verify geometry conversions (all 4 rotations 0°/90°/180°/270°), WinAnsi text sanitization, annotation burning, AcroForms, and document organization:
```bash
npm test
```

### 4. Build for Production
Copies `pdfjs-dist` worker/cmaps/fonts into `public/pdfjs/` and bundles the frontend with Vite:
```bash
npm run build
```

### 5. Package Desktop Application
Creates distributable desktop installers (`.exe` on Windows) via `electron-builder`:
```bash
npm run dist
```

---

## Known Limitations

1. **Encrypted / Password-Protected PDFs**:
   `pdf-lib` does not support modifying encrypted documents. PDF Studio detects encrypted files upon opening, loads them in read-only mode, and displays a warning to prevent document corruption.
2. **Standard PDF Fonts Character Support**:
   PDF Standard 14 fonts (Helvetica, Times-Roman, Courier) only support the WinAnsi character set. Any unsupported characters (such as emojis or non-Latin scripts) are sanitized to `?` by `src/engine/textSanitizer.js` to avoid runtime font-encoding exceptions.
3. **Tesseract.js OCR Offline Notice**:
   On the very first run of OCR for a particular language, Tesseract downloads language traineddata files over the internet, after which they are cached locally for offline use.
