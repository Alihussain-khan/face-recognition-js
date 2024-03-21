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
      video: { width: { exact: 1280 }, height: { exact: 720 } },
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
  //people to match
  const labels = ["Mughees", "amjad"];
  try {
    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 0; i < 1; i++) {
          const img = await faceapi.fetchImage(`./labels/${label}/${i}.jpg`);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (detections) {
            descriptions.push(detections.descriptor);
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

const capture = async () => {
  //
  const bitmap = await createImageBitmap(video);
  bitmap.width = 600;
  bitmap.height = 450;
  //canvas
  const can = document.createElement("canvas");
  const context = can.getContext("2d");
  can.width = 600;
  can.height = 450;
  //draw
  context.drawImage(bitmap, 0, 0); //if you dont want to show
  context.drawImage(bitmap, 0, 0, can.width, can.height); //if you want to show
  //adding to the body
  document.body.appendChild(can);
  //saving url
  const base64Image = can.toDataURL();
  const userimage = base64Image;
  //loading all the descriptions
  const labeledFaceDescriptors = await getLabeledFaceDescriptions();
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
  //adding video to the html
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);

  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);
  // Create a new Image element
  const image = new Image();

  // Set the source of the image element to the base64 string
  image.src = userimage;

  // Wait for the image to load
  image.onload = async () => {
    const detections = await faceapi
      .detectAllFaces(can)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const results = resizedDetections.map((d) => {
      return faceMatcher.findBestMatch(d.descriptor);
    });
    alert(results);
  };
  //
};
