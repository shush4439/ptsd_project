/**
 * Safe Sounds Screen Script - Grid Toggles
 */
(() => {
  const sounds = ['rain', 'ocean', 'wind', 'binaural'];
  const stopAllBtn = document.getElementById('stop-all-sounds-btn');

  // Helper to stop all sound engines
  const stopAllActiveSounds = () => {
    AudioEngine.stopRain();
    AudioEngine.stopOcean();
    AudioEngine.stopWind();
    AudioEngine.stopBinaural();
  };

  // Helper to update UI states for all tiles
  const updateUI = () => {
    sounds.forEach(sound => {
      const tile = document.getElementById(`tile-${sound}`);
      if (!tile) return;
      const audioState = AppState.audio[sound];
      
      if (audioState && audioState.playing) {
        tile.classList.add('playing');
      } else {
        tile.classList.remove('playing');
      }
    });
    if (window.lucide) window.lucide.createIcons();
  };

  // Synchronize UI on load
  updateUI();

  // Attach click listeners to tiles
  sounds.forEach(sound => {
    const tile = document.getElementById(`tile-${sound}`);
    if (!tile) return;

    tile.addEventListener('click', () => {
      AudioEngine.resume();
      const audioState = AppState.audio[sound];

      if (audioState.playing) {
        // Stop this sound
        if (sound === 'rain') AudioEngine.stopRain();
        if (sound === 'ocean') AudioEngine.stopOcean();
        if (sound === 'wind') AudioEngine.stopWind();
        if (sound === 'binaural') AudioEngine.stopBinaural();
      } else {
        // Auto-stop all other sounds first (Only one sound at a time preferred)
        stopAllActiveSounds();
        
        // Start this sound
        if (sound === 'rain') AudioEngine.startRain();
        if (sound === 'ocean') AudioEngine.startOcean();
        if (sound === 'wind') AudioEngine.startWind();
        if (sound === 'binaural') AudioEngine.startBinaural();
      }
      
      updateUI();
    });
  });

  // Stop All Button handler
  if (stopAllBtn) {
    stopAllBtn.addEventListener('click', () => {
      stopAllActiveSounds();
      updateUI();
    });
  }
})();
