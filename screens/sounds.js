/**
 * Safe Sounds Screen Script
 */
(() => {
  const sounds = ['rain', 'ocean', 'wind', 'binaural'];
  const stopAllBtn = document.getElementById('stop-all-sounds-btn');

  // Synchronize UI with current playing state
  sounds.forEach(sound => {
    const card = document.getElementById(`card-${sound}`);
    const playBtn = document.getElementById(`play-${sound}`);
    const volSlider = document.getElementById(`volume-${sound}`);
    const audioState = AppState.audio[sound];

    if (!card || !playBtn || !volSlider) return;

    // Set slider value
    volSlider.value = audioState.volume;

    // Set playing class and icons
    if (audioState.playing) {
      card.classList.add('playing');
      playBtn.innerHTML = `<i data-lucide="square"></i>`;
    } else {
      card.classList.remove('playing');
      playBtn.innerHTML = `<i data-lucide="play"></i>`;
    }

    // Play/Pause button event listener
    playBtn.addEventListener('click', () => {
      AudioEngine.resume();

      if (audioState.playing) {
        if (sound === 'rain') AudioEngine.stopRain();
        if (sound === 'ocean') AudioEngine.stopOcean();
        if (sound === 'wind') AudioEngine.stopWind();
        if (sound === 'binaural') AudioEngine.stopBinaural();
        
        card.classList.remove('playing');
        playBtn.innerHTML = `<i data-lucide="play"></i>`;
      } else {
        if (sound === 'rain') AudioEngine.startRain();
        if (sound === 'ocean') AudioEngine.startOcean();
        if (sound === 'wind') AudioEngine.startWind();
        if (sound === 'binaural') AudioEngine.startBinaural();
        
        card.classList.add('playing');
        playBtn.innerHTML = `<i data-lucide="square"></i>`;
      }
      
      if (window.lucide) window.lucide.createIcons();
    });

    // Volume slider event listener
    volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      AudioEngine.updateVolume(sound, vol);
    });
  });

  // Stop All Button click handler
  if (stopAllBtn) {
    stopAllBtn.addEventListener('click', () => {
      AudioEngine.stopRain();
      AudioEngine.stopOcean();
      AudioEngine.stopWind();
      AudioEngine.stopBinaural();

      sounds.forEach(sound => {
        const card = document.getElementById(`card-${sound}`);
        const playBtn = document.getElementById(`play-${sound}`);
        if (card && playBtn) {
          card.classList.remove('playing');
          playBtn.innerHTML = `<i data-lucide="play"></i>`;
        }
      });
      if (window.lucide) window.lucide.createIcons();
    });
  }

  if (window.lucide) window.lucide.createIcons();
})();
