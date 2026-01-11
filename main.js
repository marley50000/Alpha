const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const statusElement = document.getElementById("status");
const report = document.getElementById("report");

let apriltag;
let camera;
let animationFrameId;

async function run() {
    const worker = new Worker('worker.js');
    const Apriltag = Comlink.wrap(worker);

    apriltag = await new Apriltag(Comlink.proxy(() => {
        apriltag.set_camera_info(640, 480, 320, 240); // Default camera info
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
    const tagIds = detections.map(d => d.id).join(', ');
    report.textContent = `Tag IDs: ${tagIds}`;
    
    fetch('/api/detections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(detections),
    });

    drawDetections(detections);
  } else {
    statusElement.textContent = "No tags detected.";
    report.textContent = "No detections.";
  }

  animationFrameId = requestAnimationFrame(detect);
}

function project(p, pose) {
    const fx = 640; // Default focal length x
    const fy = 480; // Default focal length y
    const cx = 320; // Default principal point x
    const cy = 240; // Default principal point y

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
