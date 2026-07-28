// ============================================================
// intro.js — Gestion de l'intro signature
// ============================================================

export function initIntro(onComplete) {
  const overlay = document.getElementById('intro-overlay');
  const video = document.getElementById('intro-video');
  const progressFill = document.getElementById('intro-progress-fill');
  const progressTrack = document.getElementById('intro-progress-track');
  const startBtn = document.getElementById('intro-start-btn');
  const subEl = document.getElementById('intro-sub');

  let started = false;
  let ended = false;
  let rafId = null;

  function startIntro() {
    if (started) return;
    started = true;

    video.muted = false;
    video.classList.add('visible');
    progressTrack.classList.add('visible');
    startBtn.style.display = 'none';
    subEl.classList.add('visible');

    video.play().catch(() => video.play());

    function updateProgress() {
      if (ended) return;
      if (video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        progressFill.style.width = Math.min(100, pct) + '%';
      }
      rafId = requestAnimationFrame(updateProgress);
    }
    updateProgress();

    video.addEventListener('ended', () => {
      ended = true;
      if (rafId) cancelAnimationFrame(rafId);
      progressFill.style.width = '100%';

      setTimeout(() => {
        overlay.classList.add('hidden');
        setTimeout(() => {
          overlay.style.display = 'none';
          if (onComplete) onComplete();
        }, 600);
      }, 400);
    });
  }

  // START button
  startBtn?.addEventListener('click', startIntro);
  // Click n'importe où pour lancer aussi
  overlay?.addEventListener('click', (e) => {
    if (!started && e.target !== startBtn) startIntro();
  });
}