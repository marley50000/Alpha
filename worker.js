// Import Comlink
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

// Import the WASM module
importScripts('apriltag_wasm.js');
self.ApriltagWasm = ApriltagWasm;

class Apriltag {
    constructor(onReady) {
        if (typeof ApriltagWasm === 'undefined') {
            return;
        }
        ApriltagWasm().then(module => {
            this.detector = new module.Detector();
            onReady();
        });
    }

    set_camera_info(width, height, fx, fy, cx, cy) {
        if (this.detector) {
            this.detector.set_camera_info(width, height, fx, fy, cx, cy);
        }
    }

    detect(grayscale, width, height) {
        if (this.detector) {
            return this.detector.detect(grayscale, width, height);
        }
        return [];
    }
}

Comlink.expose(Apriltag);
