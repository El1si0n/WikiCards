// Moteur audio procédural Web Audio API pour WikiCards
// Génère des effets sonores réalistes et cristallins (déchirure de booster, glissement de carte, révélations par rareté)
// sans dépendre de fichiers MP3 externes.

const SOUND_STORAGE_KEY = 'wikicards_sound_muted_v1';

class SoundManager {
  constructor() {
    this.ctx = null;
    this.noiseBuffer = null;
    this.muted = false;
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      if (saved !== null) {
        this.muted = JSON.parse(saved);
      }
    } catch {
      this.muted = false;
    }
  }

  initContext() {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.noiseBuffer) {
      // Crée 2 secondes de bruit blanc en cache pour les effets de papier/sachet
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.ctx;
  }

  isMuted() {
    return this.muted;
  }

  setMuted(value) {
    this.muted = Boolean(value);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(this.muted));
    } catch {
      // Ignore storage errors
    }
    return this.muted;
  }

  toggleMute() {
    return this.setMuted(!this.muted);
  }

  // Petit clic sec au survol ou sélection du booster
  playBoosterCharge() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Son de déchirure du sachet métallisé (foil rip + ouverture lumineuse)
  playPackRip() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Froissement initial du sachet (0.0s -> 0.12s)
    this._playFilteredNoise({
      startTime: now,
      duration: 0.12,
      startFreq: 1200,
      endFreq: 2400,
      q: 2.5,
      peakGain: 0.14,
      filterType: 'bandpass',
    });

    // 2. Grande déchirure franche de la languette supérieure (0.09s -> 0.44s)
    this._playFilteredNoise({
      startTime: now + 0.09,
      duration: 0.36,
      startFreq: 1400,
      endFreq: 5800,
      q: 1.8,
      peakGain: 0.24,
      filterType: 'bandpass',
    });

    // Texture haute fréquence métallique du sachet (crinkle)
    this._playFilteredNoise({
      startTime: now + 0.11,
      duration: 0.3,
      startFreq: 4500,
      endFreq: 8500,
      q: 3.5,
      peakGain: 0.12,
      filterType: 'highpass',
    });

    // 3. Impact grave doux à l'ouverture du paquet (0.38s)
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(135, now + 0.36);
    popOsc.frequency.exponentialRampToValueAtTime(42, now + 0.56);

    popGain.gain.setValueAtTime(0.001, now + 0.36);
    popGain.gain.linearRampToValueAtTime(0.22, now + 0.39);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    popOsc.connect(popGain);
    popGain.connect(ctx.destination);
    popOsc.start(now + 0.36);
    popOsc.stop(now + 0.6);

    // 4. Petit accord cristallin d'ouverture de paquet
    const openNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    openNotes.forEach((freq, idx) => {
      this._playTone({
        freq,
        startTime: now + 0.35 + idx * 0.045,
        duration: 0.38,
        peakGain: 0.06,
        type: 'triangle',
      });
    });
  }

  // Son de glissement / retournement de carte carton (whoosh + snap)
  playCardSlide() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frottement doux de carte sur carte
    this._playFilteredNoise({
      startTime: now,
      duration: 0.11,
      startFreq: 950,
      endFreq: 3200,
      q: 2.2,
      peakGain: 0.14,
      filterType: 'bandpass',
    });

    // Petit "snap" sec du carton
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(320, now + 0.02);
    snapOsc.frequency.exponentialRampToValueAtTime(110, now + 0.075);

    snapGain.gain.setValueAtTime(0.001, now + 0.02);
    snapGain.gain.linearRampToValueAtTime(0.11, now + 0.03);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now + 0.02);
    snapOsc.stop(now + 0.09);
  }

  // Son de révélation adapté à la rareté de la carte affichée
  playRarityReveal(rarityCode) {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (rarityCode) {
      case 'C': {
        // Commun : Note douce et feutrée
        this._playTone({
          freq: 523.25, // C5
          startTime: now + 0.04,
          duration: 0.22,
          peakGain: 0.06,
          type: 'sine',
        });
        break;
      }

      case 'PC': {
        // Peu Commun : Double note claire (C5 -> E5)
        this._playTone({
          freq: 523.25,
          startTime: now + 0.03,
          duration: 0.24,
          peakGain: 0.07,
          type: 'triangle',
        });
        this._playTone({
          freq: 659.25,
          startTime: now + 0.09,
          duration: 0.32,
          peakGain: 0.08,
          type: 'triangle',
        });
        break;
      }

      case 'R': {
        // Rare : Arpège brillant majeur (D5 -> F#5 -> A5 -> D6)
        const notes = [587.33, 739.99, 880.0, 1174.66];
        notes.forEach((freq, i) => {
          this._playTone({
            freq,
            startTime: now + 0.02 + i * 0.055,
            duration: 0.42,
            peakGain: 0.075,
            type: 'triangle',
          });
        });
        break;
      }

      case 'SR': {
        // Super Rare : Accord riche doré + harmoniques aiguës scintillantes
        const notes = [523.25, 659.25, 783.99, 987.77, 1318.51]; // Cmaj9
        notes.forEach((freq, i) => {
          this._playTone({
            freq,
            startTime: now + 0.02 + i * 0.05,
            duration: 0.55,
            peakGain: 0.085,
            type: 'triangle',
          });
          // Harmonique cristalline à l'octave
          this._playTone({
            freq: freq * 2,
            startTime: now + 0.05 + i * 0.05,
            duration: 0.4,
            peakGain: 0.03,
            type: 'sine',
          });
        });
        break;
      }

      case 'UR': {
        // Ultra Rare : Impact grave + montée prismatique brillante
        this._playTone({
          freq: 130.81, // C3 basse
          startTime: now,
          duration: 0.65,
          peakGain: 0.14,
          type: 'sine',
        });
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
        notes.forEach((freq, i) => {
          this._playTone({
            freq,
            startTime: now + 0.02 + i * 0.048,
            duration: 0.68,
            peakGain: 0.09,
            type: 'triangle',
          });
          this._playTone({
            freq: freq * 1.5,
            startTime: now + 0.06 + i * 0.048,
            duration: 0.5,
            peakGain: 0.035,
            type: 'sine',
          });
        });
        break;
      }

      case 'L': {
        // Légendaire : Fanfare céleste épique (basse profonde + arpège royal + scintillement prolongé)
        this._playTone({
          freq: 110.0, // A2
          startTime: now,
          duration: 0.9,
          peakGain: 0.18,
          type: 'sine',
        });
        this._playTone({
          freq: 220.0, // A3
          startTime: now + 0.02,
          duration: 0.85,
          peakGain: 0.12,
          type: 'triangle',
        });

        // Arpège lumineux en La Majeur / Doré
        const epicNotes = [440.0, 554.37, 659.25, 880.0, 1108.73, 1318.51, 1760.0];
        epicNotes.forEach((freq, i) => {
          this._playTone({
            freq,
            startTime: now + 0.03 + i * 0.055,
            duration: 0.85,
            peakGain: 0.095,
            type: 'triangle',
          });
          // Scintillement aigu (shimmer)
          this._playTone({
            freq: freq * 2,
            startTime: now + 0.08 + i * 0.06,
            duration: 0.7,
            peakGain: 0.04,
            type: 'sine',
          });
        });

        // Souffle brillant léger
        this._playFilteredNoise({
          startTime: now + 0.05,
          duration: 0.55,
          startFreq: 3000,
          endFreq: 9000,
          q: 3.0,
          peakGain: 0.06,
          filterType: 'bandpass',
        });
        break;
      }

      default:
        break;
    }
  }

  // Son de fin d'ouverture (arrivée sur le récapitulatif des 5 cartes)
  playSummaryFanfare() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // Accord de Do Majeur
    chord.forEach((freq, i) => {
      this._playTone({
        freq,
        startTime: now + i * 0.035,
        duration: 0.45,
        peakGain: 0.065,
        type: 'triangle',
      });
    });
  }

  // Petit tintement lors de l'ajout en favori
  playFavoriteToggle(isAdding) {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (isAdding) {
      this._playTone({
        freq: 880,
        startTime: now,
        duration: 0.14,
        peakGain: 0.06,
        type: 'sine',
      });
      this._playTone({
        freq: 1318.51,
        startTime: now + 0.05,
        duration: 0.2,
        peakGain: 0.07,
        type: 'sine',
      });
    } else {
      this._playTone({
        freq: 659.25,
        startTime: now,
        duration: 0.14,
        peakGain: 0.05,
        type: 'sine',
      });
    }
  }

  // Son de pièces / Wikithunes (lors du recyclage de cartes ou gain d'argent)
  playCoinSound() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Double tintement métallique brillant (B5 -> E6)
    this._playTone({
      freq: 987.77,
      startTime: now,
      duration: 0.16,
      peakGain: 0.08,
      type: 'sine',
    });
    this._playTone({
      freq: 1318.51,
      startTime: now + 0.065,
      duration: 0.34,
      peakGain: 0.09,
      type: 'sine',
    });
    this._playTone({
      freq: 2637.02,
      startTime: now + 0.07,
      duration: 0.22,
      peakGain: 0.03,
      type: 'triangle',
    });
  }

  // Petit son sourd discret en cas de solde insuffisant
  playErrorSound() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this._playTone({
      freq: 220,
      startTime: now,
      duration: 0.12,
      peakGain: 0.07,
      type: 'triangle',
    });
    this._playTone({
      freq: 165,
      startTime: now + 0.09,
      duration: 0.18,
      peakGain: 0.07,
      type: 'triangle',
    });
  }

  // Petit "clic" mécanique lors de la rotation de la jauge du WikiSino
  playWheelTick(pitchMultiplier = 1) {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    this._playTone({
      freq: 680 * pitchMultiplier,
      startTime: now,
      duration: 0.028,
      peakGain: 0.045,
      type: 'triangle',
    });
  }

  // Son de victoire à l'Upgrader (accord triomphant + son de révélation de la rareté)
  playUpgradeWin(rarityCode = 'R') {
    const ctx = this.initContext();
    if (!ctx) return;

    this.playRarityReveal(rarityCode);
    this.playCoinSound();
  }

  // Son de défaite à l'Upgrader (descente douce en mineur)
  playUpgradeLoss() {
    const ctx = this.initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [392.0, 349.23, 293.66, 220.0]; // G4, F4, D4, A3
    notes.forEach((freq, idx) => {
      this._playTone({
        freq,
        startTime: now + idx * 0.075,
        duration: 0.24,
        peakGain: 0.065,
        type: 'triangle',
      });
    });
  }

  // Helper interne : génère une note synthétique avec enveloppe ADSR douce
  _playTone({ freq, startTime, duration, peakGain, type = 'sine' }) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.025, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // Helper interne : génère un bruit filtré (papier, déchirure foil, souffle)
  _playFilteredNoise({
    startTime,
    duration,
    startFreq,
    endFreq,
    q = 1.5,
    peakGain = 0.15,
    filterType = 'bandpass',
  }) {
    if (!this.ctx || !this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + duration * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }
}

export const soundManager = new SoundManager();
