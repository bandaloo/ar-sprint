import * as handTrack from "handtrackjs";

const video = createVideo({ video: true });
let model = null;

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById(
  "canvas"
));

const context = canvas.getContext("2d");

let currPredictions = [];

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
    console.log("video started", status);
    video.style.height = "";
    runDetection();
  });
}

/*
bbox: (4) [164.75631713867188, 55.81468105316162, 192.0635223388672, 270.14423847198486]
class: 5
label: "face"
score: "0.96"
*/

function runDetection() {
  if (model === null) throw new Error("model was null");
  model.detect(video).then((predictions) => {
    //console.log("Predictions: ", predictions);
    //model.renderPredictions(predictions, canvas, context, video);
    currPredictions = predictions;
    requestAnimationFrame(runDetection);
  });
}

console.log("test");

function render(time) {
  console.log(time);
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, 0, 0);
  context.restore();
  for (const p of currPredictions) {
    console.log(p);
    const [x, y, w, h] = p.bbox;
    context.fillStyle = "#f006";
    context.fillRect(x, y, w, h);
  }
  requestAnimationFrame(render);
}

requestAnimationFrame(render);

// Load the model.
handTrack.load(modelParams).then((lmodel) => {
  // detect objects in the image.
  console.log(lmodel);
  model = lmodel;
  console.log(model);
  startVideo();
});
