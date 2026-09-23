const app = document.getElementById('app');
const torchBtn = document.getElementById('torchBtn');
const statusEl = document.getElementById('status');
const hintMain = document.getElementById('hintMain');
const hintSub = document.getElementById('hintSub');
const overlay = document.getElementById('overlay');
const payBtn = document.getElementById('payBtn');
const liveBtn = document.getElementById('liveBtn');

let isOn = false;
let cameraStream = null;
let torchTrack = null;
let torchSupported = null; // null = unknown, true/false once we've tried

function setOn(on) {
  isOn = on;
  app.classList.toggle('on', on);
  statusEl.textContent = on ? 'On · 1,200 lm' : 'Off';
  hintMain.textContent = on ? 'Tap to turn off' : 'Tap to turn on';
  hintSub.textContent = on
    ? 'Deactivation may require a license'
    : 'Free · No credit card required';
}

function showOverlay() {
  overlay.classList.add('show');
}

function hideOverlay() {
  overlay.classList.remove('show');
}

function showToast(message, duration = 2600) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), duration);
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

payBtn.addEventListener('click', async () => {
  payBtn.classList.add('processing');
  payBtn.textContent = 'Processing payment...';

  await disableTorch();

  setTimeout(() => {
    payBtn.classList.remove('processing');
    payBtn.textContent = '💳 Pay $299 to Turn Off';
    hideOverlay();
    setOn(false);
    showToast("Just kidding — no charge. It's a novelty app 😄");
  }, 1400);
});

window.addEventListener('pagehide', () => {
  disableTorch();
});
