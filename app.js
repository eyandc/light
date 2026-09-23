const app = document.getElementById('app');
const torchBtn = document.getElementById('torchBtn');
const statusEl = document.getElementById('status');
const hintMain = document.getElementById('hintMain');
const hintSub = document.getElementById('hintSub');
const overlay = document.getElementById('overlay');

const payBtn = document.getElementById('payBtn');
const liveBtn = document.getElementById('liveBtn');
const qrCode = document.getElementById('qrCode');
const scanBtn = document.getElementById('scanBtn');
const qrCancelBtn = document.getElementById('qrCancelBtn');
const gotchaBtn = document.getElementById('gotchaBtn');

const steps = {
  paywall: document.getElementById('stepPaywall'),
  qr: document.getElementById('stepQr'),
  verify: document.getElementById('stepVerify'),
  gotcha: document.getElementById('stepGotcha'),
};

let isOn = false;
let cameraStream = null;
let torchTrack = null;
let torchSupported = null; // null = unknown, true/false once we've tried
let scanTimer = null;

function setOn(on) {
  isOn = on;
  app.classList.toggle('on', on);
  statusEl.textContent = on ? 'On · 1,200 lm' : 'Off';
  hintMain.textContent = on ? 'Tap to turn off' : 'Tap to turn on';
  hintSub.textContent = on
    ? 'Deactivation may require a license'
    : 'Free · No credit card required';
}

function showStep(name) {
  Object.entries(steps).forEach(([key, el]) => {
    el.classList.toggle('active', key === name);
  });
}

function showOverlay() {
  clearInterval(scanTimer);
  showStep('paywall');
  overlay.classList.add('show');
}

function hideOverlay() {
  clearInterval(scanTimer);
  overlay.classList.remove('show');
}

/* Fake QR code — a visual prop only, not a real scannable code. */
function renderFakeQr() {
  const size = 21;
  const cell = 8;
  const px = size * cell;
  const cells = [];
  for (let y = 0; y < size; y++) {
    cells.push(new Array(size).fill(false));
  }

  function stampFinder(fx, fy) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[fy + y][fx + x] = border || core;
      }
    }
  }

  stampFinder(0, 0);
  stampFinder(size - 7, 0);
  stampFinder(0, size - 7);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinderZone =
        (x < 8 && y < 8) ||
        (x > size - 9 && y < 8) ||
        (x < 8 && y > size - 9);
      if (inFinderZone) continue;
      cells[y][x] = Math.random() > 0.55;
    }
  }

  let rects = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (cells[y][x]) {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
      }
    }
  }

  qrCode.innerHTML = `<svg viewBox="0 0 ${px} ${px}" fill="#17171a">${rects}</svg>`;
}

function startScanTimer() {
  let time = 10;
  scanBtn.disabled = true;
  scanBtn.textContent = `Waiting for scan… (${time})`;

  clearInterval(scanTimer);
  scanTimer = setInterval(() => {
    time--;
    if (time <= 0) {
      clearInterval(scanTimer);
      scanBtn.disabled = false;
      scanBtn.textContent = 'I Already Paid';
      return;
    }
    scanBtn.textContent = `Waiting for scan… (${time})`;
  }, 1000);
}

async function enableTorch() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    torchSupported = false;
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
    });
    const [track] = cameraStream.getVideoTracks();
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};

    if (!capabilities.torch) {
      torchSupported = false;
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
      return;
    }

    await track.applyConstraints({ advanced: [{ torch: true }] });
    torchTrack = track;
    torchSupported = true;
  } catch (err) {
    torchSupported = false;
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
  }
}

async function disableTorch() {
  if (torchTrack) {
    try {
      await torchTrack.applyConstraints({ advanced: [{ torch: false }] });
    } catch (err) {
      // ignore — we're stopping the track anyway
    }
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
  }
  cameraStream = null;
  torchTrack = null;
}

torchBtn.addEventListener('click', async () => {
  if (!isOn) {
    setOn(true);
    await enableTorch();
    if (torchSupported === false) {
      hintSub.textContent = 'Using screen glow (device flash unsupported)';
    }
    return;
  }
  showOverlay();
});

liveBtn.addEventListener('click', () => {
  hideOverlay();
});

qrCancelBtn.addEventListener('click', () => {
  hideOverlay();
});

payBtn.addEventListener('click', () => {
  renderFakeQr();
  showStep('qr');
  startScanTimer();
});

scanBtn.addEventListener('click', async () => {
  showStep('verify');

  await disableTorch();

  setTimeout(() => {
    setOn(false);
    showStep('gotcha');
  }, 2200);
});

gotchaBtn.addEventListener('click', () => {
  hideOverlay();
});

window.addEventListener('pagehide', () => {
  disableTorch();
});
