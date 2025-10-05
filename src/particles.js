// particles.js
// tsParticles integration stub. This keeps particle setup isolated.
// Later you can add theme switching, performance toggles, dynamic configs, etc.

export async function initParticles() {
  if (!window.tsParticles) return;
  await window.tsParticles.load({ id: 'particles', options: particleConfig });
}

const particleConfig = {
  background: { color: 'transparent' },
  fpsLimit: 60,
  fullScreen: { enable: false },
  detectRetina: true,
  particles: {
    number: { value: 55, density: { enable: true, area: 800 } },
    color: { value: ['#5b8aff', '#5ad48c', '#f5a524'] },
    opacity: { value: 0.12, random: { enable: true, minimumValue: 0.05 } },
    size: { value: { min: 1, max: 3 } },
    links: { enable: true, distance: 140, opacity: 0.15, color: '#5b8aff' },
    move: { enable: true, speed: 0.4, outModes: 'out' }
  },
  interactivity: {
    events: { onHover: { enable: true, mode: 'repulse' }, resize: true },
    modes: { repulse: { distance: 85 } }
  }
};
