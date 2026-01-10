const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const statusElement = document.getElementById("status");

let apriltag;
let camera;
let animationFrameId;

async function run() {
    const worker = new Worker('worker.js');
    const Apriltag = Comlink.wrap(worker);

    apriltag = await new Apriltag(Comlink.proxy(() => {
        statusElement.textContent = "AprilTag detector ready.";
        startButton.disabled = false;
        startButton.addEventListener("click", startCamera);
    }));
}

run();

async function startCamera() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      video.srcObject = stream;
      video.play();
      video.addEventListener("loadedmetadata", () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        detect();
      });
      startButton.style.display = "none";
    } catch (error) {
      console.error("Error accessing camera:", error);
      statusElement.textContent = "Error accessing camera. Please grant permission.";
    }
  } else {
    console.error("getUserMedia is not supported in this browser.");
    statusElement.textContent = "Camera access is not supported in this browser.";
  }
}

async function detect() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const grayscalePixels = new Uint8Array(canvas.width * canvas.height);

  for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
    const grayscale = Math.round(
      (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3
    );
    grayscalePixels[j] = grayscale;
  }

  const detections = await apriltag.detect(Comlink.transfer(grayscalePixels, [grayscalePixels.buffer]), canvas.width, canvas.height);

  if (detections.length > 0) {
    statusElement.textContent = `Detected ${detections.length} tags.`;
    drawDetections(detections);
  } else {
    statusElement.textContent = "No tags detected.";
  }

  animationFrameId = requestAnimationFrame(detect);
}

function drawDetections(detections) {
  for (const detection of detections) {
    const [topLeft, topRight, bottomRight, bottomLeft] = detection.corners;

    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(
      `ID: ${detection.id}`,
      detection.center.x - 20,
      detection.center.y
    );
  }
}
