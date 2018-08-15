import MovieClip from 'movieclip/MovieClip';
import AnimationData from 'movieclip/AnimationData';
import View from 'ui/View';
import ImageView from 'ui/ImageView';
import Image from 'ui/resource/Image';
import Engine from 'ui/Engine';
import device from 'device';
import WebGLContext2D from 'platforms/browser/webgl/WebGLContext2D';
import TextureWrapper from 'ui/TextureWrapper';
import Canvas from 'platforms/browser/Canvas';

var webglSupported = WebGLContext2D.isSupported;
device.init();

import doc from 'platforms/browser/doc';

class AssetViewer extends View {
  constructor (opts) {
    super(opts);

    this.engine = new Engine({
      view: this,
      useWebGL: true,
      alwaysRepaint: true,
      logsEnabled: true,
      showFPS: false,
      clearEachFrame: false
    });
    this.engine.show();
    this.engine.startLoop();

    this.movieClip = new MovieClip({
      parent: this
    });

    this.stageOrigin = this.createHairCross(20, '#000000');
    this.animationOrigin = this.createHairCross(20, '#ff0000');

    this.menu = opts.menu;
    this.menu.setViewer(this);

    doc.setScalingMode(doc.SCALING.FIXED, {
      width: opts.width,
      height: opts.height,
      top: opts.top,
      left: opts.left
    });

    this._currentAnimation = null;
    this.isAnimationCentered = true;
  }

  _scaleAnimation () {
    var bounds = this.movieClip.getBounds();

    var scale = Math.min(2, this.style.width / bounds.width, this.style.height / bounds.height);
    this.movieClip.style.scale = scale;

    return bounds;
  }

  centerAnimationOrigin () {
    this._scaleAnimation();

    this.movieClip.style.x = this.style.width / 2;
    this.movieClip.style.y = this.style.height / 2;

    this.animationOrigin.style.x = this.style.width / 2;
    this.animationOrigin.style.y = this.style.height / 2;

    this.stageOrigin.style.x = this.style.width / 2;
    this.stageOrigin.style.y = this.style.height / 2;

    this.isAnimationCentered = false;
  }

  centerAnimation () {
    var bounds = this._scaleAnimation();

    this.movieClip.style.x = (this.style.width / 2 - this.movieClip.style.scale * (bounds.width / 2 + bounds.x));
    this.movieClip.style.y = (this.style.height / 2 - this.movieClip.style.scale * (bounds.height / 2 + bounds.y));

    this.animationOrigin.style.x = this.movieClip.style.x;
    this.animationOrigin.style.y = this.movieClip.style.y;

    this.stageOrigin.style.x = this.style.width / 2;
    this.stageOrigin.style.y = this.style.height / 2;

    this.isAnimationCentered = true;
  }

  playAnimation (animationName) {
    this._currentAnimation = animationName;
    this.movieClip.loop(animationName);
    if (this.isAnimationCentered) {
      this.centerAnimation();
    } else {
      this.centerAnimationOrigin();
    }
  }

  setAnimations (animationsData) {
    animationsData.forEach((animationData) => {
      if (this.movieClip.data === null) {
        this.movieClip.setData(animationData);
      } else {
        this.movieClip.substituteAllAnimations(animationData);
      }
    });
    this._setupAnimations();
  }

  processAnimationData (assetsData) {
    var animationsData = [];
    for (var a = 0; a < assetsData.length; a += 1) {
      var assetData = assetsData[a];

      var domImages = assetData.images;
      var images = new Array(domImages.length);
      for (var i = 0; i < domImages.length; i += 1) {
        var domImage = domImages[i];
        images[i] = new Image({
          srcImage: webglSupported ? new TextureWrapper(domImage) : domImage
        });
      }

      var animationData = new AnimationData(assetData.data, assetData.name, images);
      animationsData.push(animationData);
    }

    this.setAnimations(animationsData);
    return animationsData;
  }

  loadAnimations (animationURLs, cb) {
    MovieClip.loadAnimations(animationURLs, (animationsData) => {
      this.setAnimations(animationsData);
      cb(animationsData);
    });
  }

  resetAnimations () {
    this.movieClip.data = null;
    this.movieClip.removeAllSubstitutions();
    this.menu.addList([]);
  }

  _setupAnimations () {
    var animationList = this.movieClip.animationList;
    if (animationList) {
      animationList.sort();
      this.menu.addList(animationList);
      if (animationList.length === 0) {
        this.movieClip.stop();
        return;
      }

      var animationName;
      if (this._currentAnimation && animationList.indexOf(this._currentAnimation) !== -1) {
        animationName = this._currentAnimation;
      } else {
        animationName = animationList[0];
      }

      this.playAnimation(animationName);
      return;
    }

    this.movieClip.stop();
  }

  // We could do something here
  // tick () {
  //   
  // }

  createHairCross (dimension, color) {
    var hairCrossCanvas = new Canvas({ useWebGL: false });
    var hairCrossContext = hairCrossCanvas.getContext('2D');

    hairCrossCanvas.width  = dimension;
    hairCrossCanvas.height = dimension;

    hairCrossContext.lineWidth = 4;
    hairCrossContext.beginPath();
    hairCrossContext.moveTo(0, 0);
    hairCrossContext.lineTo(dimension, dimension);
    hairCrossContext.moveTo(dimension, 0);
    hairCrossContext.lineTo(0, dimension);

    hairCrossContext.strokeStyle = color;
    hairCrossContext.stroke();

    hairCrossCanvas.needsUpload = true;

    var hairCrossImage = new Image({ srcImage: hairCrossCanvas });
    return new ImageView({
      parent: this,
      image: hairCrossImage,
      offsetX: -dimension / 2,
      offsetY: -dimension / 2,
      anchorX: dimension / 2,
      anchorY: dimension / 2,
      width: dimension,
      height: dimension
    });
  }
};

window.AssetViewer = AssetViewer;

