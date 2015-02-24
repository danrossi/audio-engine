/* audio.js
 * Flowplayer 5 Audio Engine
 * Modifications of the HTML5 video engine for audio support
 * 2015-02-24
 *
 * By Daniel Rossi, Electroteque Media http://flowplayer.electroteque.org/audio/fp5
 * License: X11/MIT
 *   See https://github.com/danrossi/audio-engine/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source https://github.com/danrossi/audio-engine/blob/master/src/audio.js */


!function() {
    if (typeof $.fn.flowplayer == 'function') {
        var s = flowplayer.support,
            audio = $("<audio/>")[0];


        $.extend(s, {
            audio: !!audio.canPlayType
        });

    }
}();

var AUDIO = $('<audio/>')[0];

// HTML5 --> Flowplayer event
var EVENTS = {

   // fired
   ended: 'finish',
   pause: 'pause',
   play: 'resume',
   progress: 'buffer',
   timeupdate: 'progress',
   volumechange: 'volume',
   ratechange: 'speed',
   seeking: 'beforeseek',
   seeked: 'seek',
   // abort: 'resume',

   // not fired
   //loadeddata: 'ready',

   loadedmetadata: 'ready',
   // canplay: 0,

   // error events
   // load: 0,
   // emptied: 0,
   // empty: 0,
   error: 'error',
   dataunavailable: 'error'

};

var TYPES = {
    "mp4": 'audio/mp4; codecs="mp4a.40.2, mp4a.40.5"',
    "mpeg": 'audio/mpeg; codecs="mp3"',
    "ogg": 'audio/ogg; codecs="vorbis"',
    "audio/mp4": 'audio/mp4; codecs="mp4a.40.2, mp4a.40.5"',
    "audio/mpeg": 'audio/mpeg; codecs="mp3"',
    "audio/ogg": 'audio/ogg; codecs="vorbis"'
}


function round(val) {
   return Math.round(val * 100) / 100;
}

function getAudioType(type) {
    return /mpegurl/i.test(type) ? "application/x-mpegurl" : "audio/" + type;
}

function canPlayAudio(type) {
   return !!AUDIO.canPlayType(TYPES[type]).replace("no", '');
}

//var audioTagCache;
var createAudioTag = function(audio) {
    /*if (audioTagCache) {
        return audioTagCache.attr({type: getAudioType(audio.type), src: audio.src});
    } */
    //return (audioTagCache = $("<audio/>", {
    return ($("<audio/>", {
        src: audio.src,
        type: getAudioType(audio.type),
        'class': 'fp-engine',
        'autoplay': 'autoplay',
        id: Math.random(),
        preload: 'none',
        'x-webkit-airplay': 'allow'
    }));
}

flowplayer.engine.audio = function(player, root) {


    var audioTag,
      support = flowplayer.support,
      track = $("track", $("video",root)),
      conf = player.conf,
      self,
      timer,
      originalSources,
      fallbackIndex = 0,
      api;



    $("video", root).remove();

    $(".fp-fullscreen", root).remove();

   return self = {

      pick: function(sources) {

         if (support.audio) {
             originalSources = sources;
            for (var i = 0, source; i < sources.length; i++) {
               if (canPlayAudio(sources[i].type)) {
                  // fallbackIndex = 0;
                   return sources[i];
               }
            }
         }
      },

      load: function(video) {

          if (conf.splash && !api) {

              audioTag = createAudioTag(video).prependTo(root);

             /* if (!support.inlineVideo) {
                  audioTag.css({
                      position: 'absolute',
                      top: '-9999em'
                  });
              }*/

              if (track.length) audioTag.append(track.attr("default", ""));

              if (conf.loop) audioTag.attr("loop", "loop");

              api = audioTag[0];

          } else {

              api = audioTag[0];
              var sources = audioTag.find('source');
              if (!api.src && sources.length) {
                  api.src = video.src;
                  sources.remove();
              }


              // change of clip
              if (player.video.src && video.src != player.video.src || fallbackIndex) {
                  audioTag.attr("autoplay", "autoplay");
                  api.src = video.src;

                  // preload=none or no initial "loadeddata" event
              } else if (conf.preload == 'none' || !support.dataload) {

                  if (support.zeropreload) {
                      player.trigger("ready", video).trigger("pause").one("ready", function() {
                          root.trigger("resume", [player]);
                      });

                  } else {
                      player.one("ready", function() {
                          root.trigger("pause", [player]);
                      });
                  }
              }

          }


         listen(api, video, $("source", audioTag).add(audioTag));

          if (conf.preload != 'none' || !support.zeropreload || !support.dataload) api.load();
          if (conf.splash) api.load();

      },

      pause: function() {
         api.pause();
      },

      resume: function() {
         api.play();
      },

      speed: function(val) {
         api.playbackRate = val;
      },

      seek: function(time) {
         try {
            api.currentTime = time;
         } catch (ignored) {}
      },

      volume: function(level) {
         api.volume = level;
      },

      unload: function() {
         $("audio", root).remove();
         timer = clearInterval(timer);
         api = 0;
      }

   };

   function listen(api, video, sources) {
      // listen only once
      if (api.listening) return; api.listening = true;

      player.bind("error", function(event,api,video) {
          if (fallbackIndex < originalSources.length) root.removeClass("is-error");
      });

      sources.bind("error", function(e) {
          root.removeClass("is-error");
         if (canPlayAudio($(e.target).attr("type")) && fallbackIndex >= originalSources.length) {
            player.trigger("error", { code: 4 });
         } else {
             root.removeClass("is-error");
             fallbackIndex++;
             self.load(originalSources[fallbackIndex]);
         }
      });


      $.each(EVENTS, function(type, flow) {

         api.addEventListener(type, function(e) {

            // safari hack for bad URL (10s before fails)
            if (flow == "progress" && e.srcElement && e.srcElement.readyState === 0) {
               setTimeout(function() {
                  if (!player.video.duration) {
                     flow = "error";
                     player.trigger(flow, { code: 4 });
                  }
               }, 10000);
            }

            if (conf.debug && !/progress/.test(flow)) console.log(type, "->", flow, e);

            // no events if player not ready
            if (!player.ready && !/ready|error/.test(flow) || !flow || !$("audio", root).length) { return; }

            var event = $.Event(flow), arg;

            switch (flow) {

               case "ready":
                  fallbackIndex = 0;

                  arg = $.extend(video, {
                     duration: api.duration,
                     width: api.videoWidth,
                     height: api.videoHeight,
                     url: api.currentSrc,
                     src: api.currentSrc
                  });

                  try {
                     video.seekable = api.seekable && api.seekable.end(null);

                  } catch (ignored) {}

                  // buffer
                  timer = timer || setInterval(function() {

                     try {
                        video.buffer = api.buffered.end(null);

                     } catch (ignored) {}

                     if (video.buffer) {
                        if (video.buffer <= video.duration && !video.buffered) {
                           player.trigger("buffer", e);

                        } else if (!video.buffered) {
                           video.buffered = true;
                           player.trigger("buffer", e).trigger("buffered", e);
                           clearInterval(timer);
                           timer = 0;
                        }
                     }

                  }, 250);

                  break;

               case "progress": case "seek":

                  if (api.currentTime > 0) {
                     arg = Math.max(api.currentTime, 0);
                     break;

                  } else if (flow == 'progress') {
                     return;
                  }


               case "speed":
                  arg = round(api.playbackRate);
                  break;

               case "volume":
                  arg = round(api.volume);
                  break;

               case "error":
                  arg = (e.srcElement || e.originalTarget).error;
            }

            player.trigger(event, arg);

         }, false);

      });

   }

};