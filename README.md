audio.js
============

The Audio plugin provides an audio `engine` for playing back html5 audio similar to video with the `html5` engine as it's not provided within Flowplayer 5 by default.

This feature simply requires css overrides to modify the styling of the player and enable the `audio` engine.



Examples
--------

### Basic Example

```html
<div id="player" class="flowplayer fixed-controls play-button is-splash is-audio" data-engine="audio" data-embed="false">
        <video preload="none">
            <source type="video/mp4" src="http://videos.electroteque.org/audio/Rakim.m4a">
            <source type="video/mpeg" src="http://videos.electroteque.org/audio/Rakim.mp3">
            <source type="video/ogg" src="http://videos.electroteque.org/audio/Rakim.ogg">
        </video>
</div>
```

Compiling
------------

The `audio.js` distribution file is compiled with Uglify.js like so:

```bash
uglifyjs audio.js --comments /@source/ --mangle -c > audio.min.js
```

Support
--------

This is supplied as-is.