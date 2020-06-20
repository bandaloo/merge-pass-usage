import * as MP from "@bandaloo/merge-pass";
import * as dat from "dat.gui";

// our target canvas and context
const glCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
  "gl"
));
const gl = glCanvas.getContext("webgl2");
if (gl === null) throw new Error("problem getting the gl context");

// our source canvas and context
const sourceCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
  "source"
));
const source = sourceCanvas.getContext("2d");
if (source === null) throw new Error("problem getting the source context");

// let's create a simple grain effect
const grain = MP.grain(0.1);
// let's make a blur. you could use `MP.blur2d` to get a similar effect but this
// way teaches you about loops
const horizontalBlur = MP.gauss5(MP.vec2(1, 0));
const horizontalBlurLoop = horizontalBlur.repeat(2);
const verticalBlur = MP.gauss5(MP.vec2(0, 1));
const verticalBlurLoop = verticalBlur.repeat(2);
const totalBlurLoop = MP.loop([horizontalBlurLoop, verticalBlurLoop], 2);
// this let's us rotate our hue as a function of time
const hueAdd = MP.hsv2rgb(
  MP.changecomp(MP.rgb2hsv(MP.fcolor()), MP.time(), "r", "+")
);
// let's make a brightness effect that we can change dynamically. we make a
// primitive mutable by wrapping it in `MP.mut`. the brightness level is a
// function of the distance from the center
let vec;
const brightness = MP.brightness(
  MP.op(
    MP.len(MP.op(MP.ncfcoord(), "+", (vec = MP.vec2(MP.mut(0), 0)))),
    "*",
    -1.0
  )
);

// create the merger with your source canvas and target rendering context
// the last options parameter is optional; above are all the default settings
const merger = new MP.Merger(
  [totalBlurLoop, brightness, grain, hueAdd],
  sourceCanvas,
  gl,
  {
    minFilterMode: "linear", // could also be "nearest"
    maxFilterMode: "linear", // could also be "nearest"
    edgeMode: "clamp", // cloud also be "wrap"
  }
);

// dat.gui stuff to demonstrate changeable uniforms
class Controls {
  constructor() {
    this.location = 0;
  }
}

const controls = new Controls();
const gui = new dat.GUI();
gui.add(controls, "location", -0.5, 0.5, 0.01);

let steps = 0;
const draw = (time) => {
  // you can set the time uniform to whatever you want, let's do quarter seconds
  merger.draw(time / 4000);

  // draw crazy stripes (adapted from my dweet https://www.dwitter.net/d/18968)
  const i = Math.floor(steps / 3);
  const j = Math.floor(i / 44);
  const k = i % 44;
  source.fillStyle = `hsl(${(k & j) * i},40%,${
    50 + Math.cos(time / 1000) * 10
  }%)`;
  source.fillRect(k * 24, 0, 24, k + 2);
  source.drawImage(sourceCanvas, 0, k + 2);
  steps++;

  // set the mutable component of the vec with to the value in the gui
  vec.setComp(0, -controls.location);

  requestAnimationFrame(draw);
};

// run the draw function when everything is loaded
window.onload = () => {
  draw(0);
};

// alright, do `npm run build` and open example.html in chrome or firefox. the
// top canvas has a blur, grain, hue rotate and brightness effect on it. there
// is a slider where you can change the position of the lighting effect. if you
// crack open the console, you can see the generated shaders. the horizontal and
// vertical blur are two separate shaders, because they need to be run in
// multiple passes. the rest of the effects were combined into one shader
