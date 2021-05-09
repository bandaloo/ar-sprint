import * as handTrack from "handtrackjs";
//import { Howl, Howler } from "howler";
import * as Tone from "tone";

const EYE_WIDTH_SCALAR = 0.3;
const EYE_HEIGHT_RATIO = 0.5;
const PARTICLE_SPEED_X = 3;
const PARTICLE_SPEED_Y = -8;
const PARTICLE_SIZE = 0.07;
const NOTES_NUM = 24;
const NOTE_OFFSET = 16;
const MAX_DISTORTION = 0.6;

/*
const notes = [...new Array(NOTES_NUM)].map((_, i) => {
  i += NOTE_OFFSET;
  return ["C", "D", "D#", "F", "G", "G#", "B"][i % 7] + Math.floor(i / 7);
});
*/

const getNote = (i) => {
  i += NOTE_OFFSET;
  return ["C", "D", "D#", "F", "G", "G#", "B"][i % 7] + Math.floor(i / 7);
}

const video = createVideo({ video: true });
let model = null;

const distortion = new Tone.Distortion(0).toDestination();
const synth = new Tone.PolySynth(Tone.Synth).connect(distortion).toDestination();
//synth.connect(reverb);

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
  "canvas"
));

const context = canvas.getContext("2d");

let currPredictions = [];
let handPositions = [];

document.addEventListener("keydown", (e) => {
  if (e.key === "f") canvas.requestFullscreen();
});

/**
 * @param {number} n
 * @param {number} m
 */
function mod(n, m) {
  return ((n % m) + m) % m;
}

function createVideo(constraints) {
  const video = document.createElement("video");

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      video.srcObject = stream;
      document.body.appendChild(video);
      video.play();
    })
    .catch((err) => {
      throw new Error("problem creating video: " + err.message);
    });

  return video;
}

const modelParams = {
  flipHorizontal: true, // flip e.g for video
  maxNumBoxes: 4, // maximum number of boxes to detect
  iouThreshold: 0.5, // ioU threshold for non-max suppression
  scoreThreshold: 0.6, // confidence threshold for predictions.
};

function startVideo() {
  handTrack.startVideo(video).then(function (status) {
    video.style.height = "";
    runDetection();
  });
}

function runDetection() {
  if (model === null) throw new Error("model was null");
  model.detect(video).then((predictions) => {
    currPredictions = predictions;
    requestAnimationFrame(runDetection);
  });
}

function drawEye(x, y, width, color) {
  const w = width / 4;
  const h = width / 2;
  const cx = x + (x / canvas.width - 0.5) * w * 9;
  const cy = y + (y / canvas.height - 0.5) * h * 3;
  const gradient = context.createRadialGradient(cx, cy, w, cx, cy, h);
  gradient.addColorStop(0, "black");
  gradient.addColorStop(1, color);

  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(x, y, width, width * EYE_HEIGHT_RATIO, 0, 0, 2 * Math.PI);
  context.fill();
}

class Particle {
  constructor(x, y, size) {
    this.x = x;
    this.y = y;
    this.size = size;

    this.vx = (Math.random() - 0.5) * PARTICLE_SPEED_X;
    this.vy = (0.5 + Math.random() * 0.5) * PARTICLE_SPEED_Y;
  }

  speed() {
    return Math.sqrt(this.vx ** 2 + this.vy ** 2);
  }

  draw() {
    const rad = this.size * this.speed() * PARTICLE_SIZE;
    context.fillStyle = "black";
    context.beginPath();
    context.ellipse(this.x, this.y, rad, rad, 0, 0, 2 * Math.PI);
    context.fill();
  }

  step() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
  }
}

/** @type {Particle[]} */
let particles = [];

function render(time) {
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0);
  context.restore();

  particles = particles.filter((p) => p.speed() > 0.1);

  for (const p of particles) {
    p.step();
    p.draw();
  }

  /** @type {{x: number, y: number, label: string}[]} */
  let currHandPositions = [];

  for (const p of currPredictions) {
    const [x, y, w, h] = p.bbox;
    const [xc, yc] = [x + w / 2, y + h / 2];
    currHandPositions.push({
      x: xc,
      y: Math.floor((NOTES_NUM * yc) / canvas.height),
      label: p.label,
    });
    if (p.label !== "face" && p.label !== "open") continue;
    particles.push(new Particle(xc, yc, w));
    const color = p.label === "face" ? "yellow" : "red";
    drawEye(xc, yc, w * EYE_WIDTH_SCALAR, color);
  }

  currHandPositions = currHandPositions
    .filter((x) => x.label !== "face" && x.label !== "closed")
    .sort((a, b) => a.x - b.x);

  if (currHandPositions.length === 2 && handPositions.length === 2) {
    if (currHandPositions[1].y !== handPositions[1].y) {
      console.log("hands changed");
      distortion.distortion = 0.6 * (currHandPositions[0].y / NOTES_NUM) ** 2;
      //console.log(currHandPositions[0].y / NOTES_NUM)
      //console.log(reverb.decay);
      synth.triggerAttackRelease(
        //notes[mod(currHandPositions[1].y, notes.length)],
        [
          getNote(currHandPositions[1].y),
          getNote(currHandPositions[1].y + 2),
          getNote(currHandPositions[1].y + 4)
        ],
        "8n"
      );
    }
  } else {
    console.log("num hands tracked is not 2");
  }

  handPositions = currHandPositions;

  requestAnimationFrame(render);
}

// TODO do this only once!

let started = false;
document.addEventListener("click", () => {
  if (started) return;
  started = true;
  console.log("clicked");
  document.getElementById("clickanywhere").remove();

  requestAnimationFrame(render);

  // load the model
  handTrack.load(modelParams).then((lmodel) => {
    // detect objects in the image
    model = lmodel;
    document.getElementById("giveitasecond").remove();
    startVideo();
  });
});
