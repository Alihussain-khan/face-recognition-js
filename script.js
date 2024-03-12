const video = document.getElementById("video");

// Wait for all models to be loaded before starting the webcam
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
])
  .then(startWebcam)
  .catch((error) => {
    console.error("Error loading models:", error);
  });

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    video.srcObject = stream;

    // Wait for the video to start playing before adding the event listener
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    video.play(); // Start playing the video
    video.removeEventListener("loadedmetadata", startWebcam); // Remove the listener after it's been used
  } catch (error) {
    console.error("Error starting webcam:", error);
  }
}

async function getLabeledFaceDescriptions() {
  const labels = ["Felipe", "Messi", "Data"];
  try {
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
for (let i = 1; i <= 2; i++) {
  const img = await faceapi.fetchImage(`./labels/${label}/${i}.jpg`);
  const detections = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (detections) {
    descriptions.push(detections.descriptor);
    console.log("hello")
  } else {
    console.error(`Face detection failed for ${label}/${i}.jpg`);
    // Handle the error or skip this image
  }
}

        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  } catch (error) {
    console.error("Error getting labeled face descriptions:", error);
    return []; // Return an empty array in case of an error
  }
}

video.addEventListener("play", async () => {
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);

  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.videoWidth, height: video.videoHeight }; // Use videoWidth and videoHeight instead of width and height
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);

    const results = resizedDetections.map((d) => {
      return faceMatcher.findBestMatch(d.descriptor);
    });
    results.forEach((result, i) => {
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: result.toString(), // Convert the result to a string
      });
      drawBox.draw(canvas);
    });
  }, 100);
});
