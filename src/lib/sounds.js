import AudioManager from 'AudioManager';
import soundConfig from 'src/conf/soundConfig';

class Sounds {

  constructor () {
    this.playingSong = '';

    this._musicMuted = false;
    this._sfxMuted = false;
    this._musicVolume = 1;
    this._sfxVolume = 1;

    this.music = new AudioManager({
      path: soundConfig.musicPath,
      files: soundConfig.music
    });

    this.sfx = new AudioManager({
      path: soundConfig.sfxPath,
      files: soundConfig.sfx
    });
  }

  playSound (name) {
    if (!this.sfxMuted) {
      this.sfx.setVolume(name, this._sfxVolume);
      this.sfx.play(name);
    }
  }

  stopSound (name) {
    this.sfx.stop(name);
  }

  playSong (name) {
    this.playingSong = name;
    this.music.setVolume(name, this._musicVolume);
    this.music.playBackgroundMusic(name);
  }

  resumeSong () {
    if (this.playingSong) {
      this.playSong(this.playingSong);
    }
  }

  pauseSong () {
    this.music.pauseBackgroundMusic();
  }

  stopSong () {
    if (this.playingSong) {
      this.music.stop(this.playingSong);
      this.playingSong = '';
    }
  }

  get sfxMuted () {
    return this._sfxMuted;
  }

  set sfxMuted (value) {
    this._sfxMuted = value;
    this.sfx.setEffectsMuted(value);
  }

  get musicMuted () {
    return this._musicMuted;
  }

  set musicMuted (value) {
    this._musicMuted = value;
    this.music.setMusicMuted(value);
  }

  set musicVolume (value) {
    if (value === 0) {
      this.musicMuted = true;
    } else {
      if (this._musicVolume === 0) {
        this.musicMuted = false;
      }
      this.music.setVolume(this.playingSong, this._musicVolume);
    }

    this._musicVolume = value;
  }

  get musicVolume () {
    return this._musicVolume;
  }

  set sfxVolume (value) {
    if (value === 0) {
      this.sfxMuted = true;
    } else if (this._sfxVolume === 0) {
      this.sfxMuted = false;
    }

    this._sfxVolume = value;
  }

  get sfxVolume () {
    return this._sfxVolume;
  }
}

export default new Sounds();
