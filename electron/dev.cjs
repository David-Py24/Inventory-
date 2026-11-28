const { spawn } = require('node:child_process');
const path = require('node:path');

const previewPort = process.env.ELECTRON_PREVIEW_PORT || process.env.PORT || '8081';
const rendererUrl = process.env.ELECTRON_RENDERER_URL || `http://localhost:${previewPort}`;
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const projectRoot = path.resolve(__dirname, '..');
let server = null;
let ownsServer = false;
let electron;
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (electron && !electron.killed) electron.kill();
  if (ownsServer && server && !server.killed) server.kill();
  process.exitCode = code;
}

async function isServerReady() {
  try {
    const response = await fetch(rendererUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function startServerIfNeeded() {
  // Reuse a server the developer already started (for example `npm run start`).
  if (await isServerReady()) return;

  ownsServer = true;
  server = spawn(npmCommand, ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PORT: previewPort,
      ELECTRON_PREVIEW: 'true',
    },
  });
  server.on('error', (error) => {
    console.error('Could not start the development server:', error);
    stop(1);
  });
  server.on('exit', (code) => {
    if (!stopping && code !== 0) stop(code || 1);
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && !stopping) {
    if (await isServerReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Development server did not become ready at ${rendererUrl}. Check whether port ${previewPort} is available.`);
}

startServerIfNeeded()
  .then(() => {
    electron = spawn(process.execPath, [require.resolve('electron/cli.js'), '.'], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_RENDERER_URL: rendererUrl },
    });
    electron.on('error', (error) => {
      console.error('Could not start the Electron preview:', error);
      stop(1);
    });
    electron.on('exit', (code) => stop(code || 0));
  })
  .catch((error) => {
    console.error(error.message);
    stop(1);
  });

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
