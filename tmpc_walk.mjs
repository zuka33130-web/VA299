import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const edgePath = 'C:/Program Files (x86)/Microsoft/EdgeCore/155.0.4283.62/msedge.exe';
const outDir = process.cwd();
const profile = path.join(process.env.TEMP || 'C:/Users/ZuKA/AppData/Local/Temp', 'pv-edge-natalwalk');
const port = 9254;

const edge = spawn(
  edgePath,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-extensions',
    '--no-first-run',
    '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1600,900',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await sleep(200);
  }
  throw new Error('Edge debugger did not start');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 0;
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const id = ++nextId;
            pending.set(id, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', reject);
  });
}

const seed = {
  games: {
    pong: {
      id: 'pong',
      completed: true,
      bestScore: 1200,
      completionsCount: 1,
      ceremonyShown: true,
      transitionStatus: 'completed',
      returnedToIsland: true,
    },
  },
  island70s: {
    narrativeEvents: [
      'isla-natal-primera-luz',
      'isla-natal-arcade-hallado',
      'isla-natal-arcade-encendido',
      'isla-natal-pong-victoria',
      'isla-natal-senal',
      'isla-natal-paleta',
    ],
    visitedZones: ['costa-despertar'],
    lastIslandPos: null,
  },
};

async function main() {
  await waitForDebugger();
  const response = await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`,
    { method: 'PUT' }
  );
  const target = await response.json();
  const cdp = await connect(target.webSocketDebuggerUrl);

  const evaluate = async (expression) => {
    const result = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };

  const capture = async (name) => {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(outDir, name), Buffer.from(shot.data, 'base64'));
    console.log('saved', name);
  };

  const keyHold = async (code, key, vk, ms) => {
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      code,
      key,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
    });
    await sleep(ms);
    await cdp.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      code,
      key,
      windowsVirtualKeyCode: vk,
      nativeVirtualKeyCode: vk,
    });
    await sleep(320);
  };

  const tapKey = async (code, key, vk) => keyHold(code, key, vk, 60);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('pixelverse_adventure_progress_v2', ${JSON.stringify(
      JSON.stringify(seed)
    )}); } catch (e) {}`,
  });
  await cdp.send('Page.navigate', { url: 'http://127.0.0.1:3003/' });

  for (let i = 0; i < 60; i += 1) {
    const ready = await evaluate(`document.body && document.body.innerText.length > 0`);
    if (ready) break;
    await sleep(300);
  }
  await sleep(2500);
  await evaluate(`(() => {
    const el = [...document.querySelectorAll('button, [role="button"]')].find(
      (b) => b.textContent && b.textContent.includes('CONTINUAR') && !b.disabled
    );
    if (el) el.click();
  })()`);
  await sleep(4200);
  await capture('tmpw_00_start.png');

  // 1. Subir al muelle del Puerto Norte.
  await keyHold('KeyW', 'w', 87, 900);
  await capture('tmpw_01_dock.png');

  // 2. Bajar hasta la pradera por el sendero (spawn ~820,505).
  await keyHold('KeyS', 's', 83, 1500);
  await capture('tmpw_02_beach.png');

  // 3. Bajar a la pradera y avanzar hacia el este de la cabaña hasta la puerta.
  await keyHold('KeyS', 's', 83, 1100);
  await keyHold('KeyA', 'a', 65, 2200);
  await capture('tmpw_03_cabana.png');

  // 4. Interactuar (puerta/ventana) y leer el diálogo.
  await tapKey('KeyE', 'e', 69);
  await sleep(700);
  await capture('tmpw_04_dialog.png');
  console.log('DIALOG:', (await evaluate('document.body.innerText')).slice(0, 400).replace(/\n/g, ' | '));

  // 5. Cerrar y volver al sendero de la playa para ver la pasarela y el cartel.
  await tapKey('Escape', 'Escape', 27);
  await sleep(500);
  await keyHold('KeyD', 'd', 68, 1400);
  await keyHold('KeyS', 's', 83, 1500);
  await capture('tmpw_05_path.png');
  console.log('TEXT:', (await evaluate('document.body.innerText')).slice(0, 300).replace(/\n/g, ' | '));

  cdp.close();
  edge.kill();
  spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' });
}

main()
  .catch((error) => {
    console.error(error);
    spawnSync('taskkill', ['/PID', String(edge.pid), '/T', '/F'], { stdio: 'ignore' });
  })
  .finally(() => {
    setTimeout(() => process.exit(), 300);
  });
