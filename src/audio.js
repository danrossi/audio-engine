/* audio.js
 * Flowplayer 6 Audio Engine
 * Modifications of the HTML5 video engine for audio support
 * 2015-06-12
 *
 * By Daniel Rossi, Electroteque Media http://flowplayer.electroteque.org/audio/fp5
 * License: X11/MIT
 *   See https://github.com/danrossi/audio-engine/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source https://github.com/danrossi/audio-engine/blob/master/src/audio.js */

'use strict';
!function() {

    var s = flowplayer.support,
        audio = $("<audio/>")[0];

    flowplayer.extend(s, {
        audio: !!audio.canPlayType
    });
}();

function AudioEngine(player, root) {
    this.common = flowplayer.common,
        this.bean = flowplayer.bean,
        this.support = flowplayer.support,
        this.player = player,
        this.root = root,
        this.rootClasses = root.classList,
        this.api = this.common.find("audio", root)[0],
        this.engineName = "audio",
        this.conf = player.conf,
        this.timer,
        this.volumeLevel,
        this.created = false,
        this.reload = false,
        this.originalSources = [],
        this.fallbackIndex = 0;

}

AudioEngine.AUDIO = $('<audio/>')[0];

AudioEngine.AUDIO_TYPES = {
    "mp4": 'audio/mp4; codecs="mp4a.40.2, mp4a.40.5"',
    "mpeg": 'audio/mpeg; codecs="mp3"',
    "ogg": 'audio/ogg; codecs="vorbis"',
    "audio/mp4": 'audio/mp4; codecs="mp4a.40.2, mp4a.40.5"',
    "audio/mpeg": 'audio/mpeg; codecs="mp3"',
    "audio/ogg": 'audio/ogg; codecs="vorbis"'
}

AudioEngine.getAudioType = function(type) {
    return /mpegurl/i.test(type) ? "application/x-mpegurl" : "audio/" + type;
}


AudioEngine.canPlayAudio = function(type) {
    if (!/^(audio|application)/i.test(type))
        type = AudioEngine.getAudioType(type);
    return !!AudioEngine.AUDIO.canPlayType(AudioEngine.AUDIO_TYPES[type]).replace("no", '');
}

AudioEngine.prototype.pick = function(sources) {

    if (flowplayer.support.audio) {
        for (var i = 0; i < sources.length; i++) {
            if (AudioEngine.canPlayAudio(sources[i].type)) return sources[i];
        }
    }
}

AudioEngine.prototype.createAudioTag = function(video, autoplay, preload) {
    if (typeof autoplay === 'undefined') autoplay = true;
    if (typeof preload === 'undefined') preload = 'none';

    var el  = document.createElement('audio');
    el.src = video.src;
    el.type = AudioEngine.getAudioType(video.type);
    el.className = 'fp-engine';
    el.autoplay = autoplay ? 'autoplay' : false;
    el.preload = preload;
    el.setAttribute('x-webkit-airplay', 'allow');
    return el;
}

AudioEngine.prototype.load = function(video) {

    var container = this.common.find('.fp-player', this.root)[0];
    if (this.conf.splash && !this.api) {
        this.api = this.createAudioTag(video);
        this.common.prepend(container, this.api);
        this.created = true;
    } else if (!this.api) {
        this.api = this.createAudioTag(video, !!video.autoplay || !!this.conf.autoplay, this.conf.clip.preload || 'metadata', false);
        this.common.prepend(container, this.api);
        this.created = true;
    } else {
        this.api.classList.add('fp-engine');
        this.common.find('source,track', this.api).forEach(this.common.removeNode);
        this.reload = this.api.src === video.src;
    }
    if (!flowplayer.support.inlineVideo) {
        this.common.css(this.api, {
            position: 'absolute',
            top: '-9999em'
        });
    }

    // IE does not fire delegated timeupdate events
    //this.bean.off(this.api, 'timeupdate', this.common.noop);
    //this.bean.on(this.api, 'timeupdate', this.common.noop);

    this.common.prop(this.api, 'loop', !!(video.loop || this.conf.loop));

    if (typeof this.volumeLevel !== 'undefined') {
        this.api.volume = this.volumeLevel;
    }

    if (this.player.video.src && video.src != this.player.video.src || video.index) this.common.attr(this.api, 'autoplay', 'autoplay');
    this.api.src = video.src;
    this.api.type = video.type;

    this.listen(this.api, this.common.find("source", this.api).concat(this.api), video);

    // iPad (+others?) demands load()
    if (this.conf.clip.preload != 'none' && video.type != "mpegurl" || !flowplayer.support.zeropreload || !flowplayer.support.dataload) this.api.load();
    if (this.created || this.reload) this.api.load();
    if (this.api.paused && video.autoplay) this.api.play();

}

AudioEngine.prototype.pause = function() {
    this.api.pause();
}

AudioEngine.prototype.resume = function() {
    this.api.play();
}

AudioEngine.prototype.speed = function(val) {
    this.api.playbackRate = val;
}

AudioEngine.prototype.seek = function(time) {
    try {
        var pausedState = this.player.paused;
        this.api.currentTime = time;
        if (pausedState) this.api.pause();
    } catch (ignored) {}
}

AudioEngine.prototype.volume = function(level) {
    this.volumeLevel = level;
    if (this.api) {
        this.api.volume = level;
    }
}

AudioEngine.prototype.unload = function() {
    this.common.removeNode(this.common.find('audio.fp-engine', this.root)[0]);
    this.timer = clearInterval(this.timer);
    this.api = 0;
}

AudioEngine.prototype.triggerEvent = function (event, arg) {
    this.player.trigger(event, [this.player, arg]);
}

AudioEngine.prototype.onEnded = function(e) {
    this.triggerEvent("finish");
}

AudioEngine.prototype.onPaused = function(e) {
    this.triggerEvent("pause");
}

AudioEngine.prototype.onBuffer = function(e) {
    this.triggerEvent("buffer");
}

AudioEngine.prototype.onPlay = function(e) {
    this.triggerEvent("resume");
}

AudioEngine.prototype.onProgress = function(e) {
    var arg;

    if (this.api.currentTime > 0 || this.player.live)
        arg = this.api.currentTime > 0 ? this.api.currentTime : 0;

    this.triggerEvent("progress", arg);
}

AudioEngine.prototype.onSeek = function(e) {
    var arg;

    if (this.api.currentTime > 0 || this.player.live)
        arg = this.api.currentTime > 0 ? this.api.currentTime : 0;

    this.triggerEvent("seek", arg);
}

AudioEngine.prototype.onVolumeChange = function(e) {
    var arg = this.api.volume;
    this.triggerEvent("volume", arg);
}

AudioEngine.prototype.onSpeed = function(e) {
    var arg = this.api.playbackRate;
    this.triggerEvent("speed", arg);
}

AudioEngine.prototype.onError = function(e) {
    var arg = (e.srcElement || e.originalTarget).error;
    this.triggerEvent("error", arg);
}

AudioEngine.prototype.onReady = function(e) {

    var arg = flowplayer.extend(this.player.video, {
        duration: this.api.duration,
        width: this.api.videoWidth,
        height: this.api.videoHeight,
        url: this.api.currentSrc,
        src: this.api.currentSrc,
        seekable: true
    });

    // buffer
    this.timer = this.timer || setInterval(function () {

            try {
                arg.buffer = this.api.buffered.end(null);

            } catch (ignored) {
            }

            if (arg.buffer) {
                if (~~ (0.5 + arg.buffer) < ~~ (0.5 + arg.duration) && !arg.buffered) {
                    this.player.trigger("buffer", e);

                } else if (!arg.buffered) {
                    arg.buffered = true;
                    this.player.trigger("buffer", e).trigger("buffered", e);
                    clearInterval(this.timer);
                    this.timer = 0;
                }
            }

        }.bind(this), 250);

    this.triggerEvent("ready", arg);
}


AudioEngine.prototype.listen = function(api, sources, video) {
    // listen only once
    var instanceId = this.root.getAttribute('data-flowplayer-instance-id');

    if (api.listeners && api.listeners.hasOwnProperty(instanceId)) {
        api.listeners[instanceId] = video;
        return;
    }
    (api.listeners || (api.listeners = {}))[instanceId] = video;

    this.player.on("error", function(event,api,video) {
        if (this.fallbackIndex < this.originalSources.length) this.rootClasses.remove("is-error");
    }.bind(this));

    this.bean.on(sources, 'error', function(e) {
        this.rootClasses.remove("is-error");

        if (AudioEngine.canPlayAudio(e.target.getAttribute('type')) && this.fallbackIndex >= this.originalSources.length) {
            this.player.trigger("error", { code: 4, video: extend(video, {src: api.src, url: api.src}) });
        } else {
            this.rootClasses.remove("is-error");
            this.fallbackIndex++;
            this.load(this.originalSources[this.fallbackIndex]);
        }
    }.bind(this));

    this.api.addEventListener("ended", this.onEnded.bind(this));
    this.api.addEventListener("pause", this.onPaused.bind(this));
    this.api.addEventListener("play", this.onPlay.bind(this));
    this.api.addEventListener("progress", this.onBuffer.bind(this));
    this.api.addEventListener("timeupdate", this.onProgress.bind(this));
    this.api.addEventListener("volumechange", this.onVolumeChange.bind(this));
    this.api.addEventListener("ratechange", this.onSpeed.bind(this));
    this.api.addEventListener("seeked", this.onSeek.bind(this));
    this.api.addEventListener("loadedmetadata", this.onReady.bind(this));
    this.api.addEventListener("error", this.onError.bind(this));
    this.api.addEventListener("dataunavailable", this.onError.bind(this));
}


function AudioEngineWrapper(player, root) {
    return new AudioEngine(player, root);
}

var audioEngine = AudioEngineWrapper;


audioEngine.canPlay = function(type) {
    return flowplayer.support.audio && AudioEngine.canPlayAudio(type);
};

audioEngine.engineName = 'audio';

//make the audio engine the first in the list as the video tag seems to detect it can play some mimetypes.
flowplayer.engines.unshift(audioEngine);