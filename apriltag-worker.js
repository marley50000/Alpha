// Import Comlink
importScripts("https://unpkg.com/comlink/dist/umd/comlink.js");

// Import the WASM module
importScripts('apriltag_wasm.js');

const apriltag = {
    detector: null,
    async init(onReady) {
        this.detector = await ApriltagWasm();
        onReady();
    },
    set_camera_info(width, height, fx, fy) {
        if (this.detector) {
            this.detector.set_camera_info(width, height, fx, fy);
        }
    },
    detect(grayscale, width, height) {
        if (this.detector) {
            return this.detector.detect(grayscale, width, height);
        }
        return [];
    }
};

Comlink.expose(apriltag);