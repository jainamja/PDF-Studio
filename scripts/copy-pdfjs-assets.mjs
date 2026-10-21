import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pdfjsDir = path.join(rootDir, 'node_modules', 'pdfjs-dist');
const destDir = path.join(rootDir, 'public', 'pdfjs');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) {
    console.warn(`Source folder does not exist: ${from}`);
    return;
  }
  fs.mkdirSync(to, { recursive: true });
  const entries = fs.readdirSync(from, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Copying pdf.js assets to public/pdfjs...');
fs.mkdirSync(destDir, { recursive: true });

// Copy cmaps
copyFolderSync(path.join(pdfjsDir, 'cmaps'), path.join(destDir, 'cmaps'));
// Copy standard fonts
copyFolderSync(path.join(pdfjsDir, 'standard_fonts'), path.join(destDir, 'standard_fonts'));
// Copy worker
const workerSrc = path.join(pdfjsDir, 'build', 'pdf.worker.min.js');
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, path.join(destDir, 'pdf.worker.min.js'));
}

console.log('pdf.js assets copied successfully.');
