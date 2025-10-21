// particles.js - Wrapper to initialize the lightweight particle system
// Keeps a stable public API while allowing the underlying implementation
// to be swapped without touching app code.
import { initParticles as initOptimizedParticles } from './particles-optimized.js';

export function initParticles() {
  return initOptimizedParticles();
}
