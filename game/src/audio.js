// All sound is synthesized with WebAudio: no audio files, no network.
// An engine hum follows the player's speed, a two-tone siren runs while
// wanted, and one-shots cover punches, gunshots, pickups and mission jingles.
export function createAudio() {
  let ctx = null; let master = null; let engineOsc = null; let engineGain = null;
  let sirenOsc = null; let sirenGain = null; let sirenHigh = false; let sirenTimer = 0;
  let muted = false; let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 500;
      engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      started = true; return true;
    } catch { return false; }
  }

  function tone(freq, dur, type = 'sine', vol = 0.25, slideTo = 0) {
    if (!ensure() || muted || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, low = 400) {
    if (!ensure() || muted || !ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = low;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(master); src.start(t);
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; },
    isMuted() { return muted; },
    update(dt, speedRatio, wanted) {
      if (!started || !ctx) return;
      if (engineGain) engineGain.gain.value = muted ? 0 : 0.03 + speedRatio * 0.05;
      if (engineOsc) engineOsc.frequency.value = 55 + speedRatio * 140;
      sirenTimer -= dt;
      if (wanted > 0 && sirenTimer <= 0) {
        sirenHigh = !sirenHigh; sirenTimer = 0.45;
        if (sirenOsc) sirenOsc.frequency.value = sirenHigh ? 950 : 700;
      }
      if (sirenGain) sirenGain.gain.value = (wanted > 0 && !muted) ? 0.045 : 0;
    },
    punch() { noise(0.08, 0.35, 300); tone(120, 0.1, 'square', 0.2, 60); },
    shoot() { noise(0.14, 0.5, 2500); tone(900, 0.08, 'square', 0.15, 150); },
    crash() { noise(0.25, 0.45, 500); tone(90, 0.25, 'sawtooth', 0.25, 40); },
    pickup() { tone(660, 0.09, 'sine', 0.25); setTimeout(() => tone(990, 0.12, 'sine', 0.25), 90); },
    steal() { tone(300, 0.15, 'square', 0.2, 500); },
    sirenBurst() { tone(700, 0.4, 'sine', 0.2, 950); },
    mission() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.28), i * 110)); },
    fail() { [400, 300, 200].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sawtooth', 0.2), i * 140)); },
    click() { tone(800, 0.05, 'square', 0.12); },
  };
}
