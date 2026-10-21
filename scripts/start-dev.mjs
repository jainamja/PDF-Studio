import { spawn } from 'child_process';
import http from 'http';

function checkViteReady(url = 'http://localhost:5173') {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.abort();
      resolve(false);
    });
  });
}

async function start() {
  console.log('[1/2] Starting Vite dev server...');
  const viteProcess = spawn('npx', ['vite'], {
    shell: true,
    stdio: 'inherit'
  });

  // Poll until Vite is ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 600));
    ready = await checkViteReady();
    if (ready) break;
  }

  if (!ready) {
    console.warn('Vite dev server took longer than expected, launching Electron anyway...');
  } else {
    console.log('[2/2] Vite dev server ready. Launching Electron...');
  }

  const electronProcess = spawn('npx', ['electron', '.'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.on('close', (code) => {
    viteProcess.kill();
    process.exit(code || 0);
  });
}

start();
