import * as handTrack from "handtrackjs";

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

const video = createVideo({ video: true });
let model = null;

const modelParams = {
  flipHorizontal: true, // flip e.g for video
  maxNumBoxes: 4, // maximum number of boxes to detect
  iouThreshold: 0.5, // ioU threshold for non-max suppression
  scoreThreshold: 0.6, // confidence threshold for predictions.
};

function startVideo() {
  handTrack.startVideo(video).then(function (status) {
    console.log("video started", status);
    video.style = "";
    runDetection();
  });
}

function runDetection() {
  if (model === null) throw new Error("model was null");
  model.detect(video).then((predictions) => {
    console.log("Predictions: ", predictions);
    //model.renderPredictions(predictions, canvas, context, video);
    requestAnimationFrame(runDetection);
  });
}

// Load the model.
handTrack.load(modelParams).then((lmodel) => {
  // detect objects in the image.
  console.log(lmodel);
  model = lmodel;
  console.log(model);
  startVideo();
});
