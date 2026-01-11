const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const statusElement = document.getElementById("status");
const report = document.getElementById("report");

// Camera parameters (to be unified)
const FOCAL_LENGTH_X = 500;
const FOCAL_LENGTH_Y = 500;
const PRINCIPAL_POINT_X = 320;
const PRINCIPAL_POINT_Y = 240;

let apriltag;
let animationFrameId;
const detectionHistory = {};
const FRAME_HISTORY_COUNT = 5; // Number of frames to average over

// Initial setup
startButton.disabled = false;
startButton.addEventListener("click", startCamera);
statusElement.textContent = "Click 'Start Camera' to begin.";


async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("getUserMedia is not supported in this browser.");
        statusElement.textContent = "Camera access is not supported in this browser.";
        return;
    }

    const videoConstraints = {
        facingMode: "environment",
        frameRate: { ideal: 60, max: 120 },
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        video.srcObject = stream;
        video.play();

        video.addEventListener("loadedmetadata", async () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Initialize the worker now that we have camera dimensions
            const worker = new Worker('worker.js');
            const Apriltag = Comlink.wrap(worker);
            apriltag = await new Apriltag(Comlink.proxy(() => {
                const principalPointX = video.videoWidth / 2;
                const principalPointY = video.videoHeight / 2;
                apriltag.set_camera_info(video.videoWidth, video.videoHeight, FOCAL_LENGTH_X, FOCAL_LENGTH_Y, principalPointX, principalPointY);
                detect(); // Start detection loop
            }));

            const track = stream.getVideoTracks()[0];
            const advancedConstraints = {
                exposureMode: "manual",
                focusMode: "manual",
                whiteBalanceMode: "manual",
            };

            try {
                await track.applyConstraints({ advanced: [advancedConstraints] });
                console.log("Successfully applied advanced camera constraints.");
            } catch (err) {
                console.warn("Failed to apply advanced camera constraints:", err);
            }
        });

        startButton.style.display = "none";
    } catch (error) {
        console.error("Error accessing camera:", error);
        statusElement.textContent = "Error accessing camera. Please grant permission.";
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

  const now = performance.now();
  for (const detection of detections) {
      if (!detectionHistory[detection.id]) {
          detectionHistory[detection.id] = [];
      }
      detectionHistory[detection.id].push({ ...detection, timestamp: now });
  }

  // Prune old detections from history
  for (const id in detectionHistory) {
      detectionHistory[id] = detectionHistory[id].filter(d => now - d.timestamp < 200); // Keep last 200ms
      if (detectionHistory[id].length === 0) {
          delete detectionHistory[id];
      }
  }

  const stableDetections = Object.values(detectionHistory)
      .filter(history => history.length >= FRAME_HISTORY_COUNT)
      .map(history => history[history.length - 1]); // Use the most recent stable detection

  if (stableDetections.length > 0) {
    statusElement.textContent = `Detected ${stableDetections.length} stable tags.`;
    const tagIds = stableDetections.map(d => d.id).join(', ');
    report.textContent = `Tag IDs: ${tagIds}`;

    fetch('http://127.0.0.1:5000/api/detections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stableDetections),
    }).catch(error => {
        console.error('Error sending detections to backend:', error);
    });

    drawDetections(stableDetections);
  } else {
    statusElement.textContent = "No stable tags detected.";
    report.textContent = "No detections.";
  }

  animationFrameId = requestAnimationFrame(detect);
}

function project(p, pose) {
    const fx = FOCAL_LENGTH_X;
    const fy = FOCAL_LENGTH_Y;
    const cx = video.videoWidth / 2;
    const cy = video.videoHeight / 2;

    const x = p[0] * pose.R[0][0] + p[1] * pose.R[0][1] + p[2] * pose.R[0][2] + pose.t[0];
    const y = p[0] * pose.R[1][0] + p[1] * pose.R[1][1] + p[2] * pose.R[1][2] + pose.t[1];
    const z = p[0] * pose.R[2][0] + p[1] * pose.R[2][1] + p[2] * pose.R[2][2] + pose.t[2];

    return {
        x: (x / z) * fx + cx,
        y: (y / z) * fy + cy,
    };
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

    const pose = detection.pose;
    if (pose) {
        const s = detection.size / 2;
        const vertices = [
            [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
            [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]
        ].map(p => project(p, pose));

        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];

        ctx.beginPath();
        for (const [i, j] of edges) {
            ctx.moveTo(vertices[i].x, vertices[i].y);
            ctx.lineTo(vertices[j].x, vertices[j].y);
        }
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText(
      `ID: ${detection.id}`,
      detection.center.x - 20,
      detection.center.y
    );
  }
}
