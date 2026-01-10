//- AprilTag WebAssembly port, created by Daniel Ben-Zvi.
//- Based on the AprilTag C library, created by the APRIL Robotics Laboratory at the University of Michigan.
//- https://april.eecs.umich.edu/software/apriltag
class Apriltag {
  constructor(onDetectorReady) {
    this._onDetectorReady = onDetectorReady;

    this._opt = {
      // Decimate input image by this factor
      quad_decimate: 2.0,
      // What Gaussian blur should be applied to the segmented image (standard deviation in pixels)
      quad_sigma: 0.0,
      // Use this many CPU threads
      nthreads: 1,
      // Spend more time trying to align edges of tags
      refine_edges: 1,
      // Maximum detections to return (0=return all)
      max_detections: 0,
      // Return pose (requires camera parameters)
      return_pose: 1,
      // Return pose solutions details
      return_solutions: 1,
    };

    Module.onRuntimeInitialized = () => {
      this._init();
    };
  }

  _init() {
    this._apriltag_detector_add_family_bits = Module.cwrap("apriltag_detector_add_family_bits", "void", [
      "number",
      "number",
      "number",
    ]);
    this._apriltag_detector_create = Module.cwrap("apriltag_detector_create", "number", []);
    this._apriltag_detector_destroy = Module.cwrap("apriltag_detector_destroy", "void", ["number"]);
    this._apriltag_detector_detect = Module.cwrap("apriltag_detector_detect", "number", ["number", "number"]);
    this._image_u8_create = Module.cwrap("image_u8_create", "number", ["number", "number"]);
    this._image_u8_destroy = Module.cwrap("image_u8_destroy", "void", ["number"]);
    this._tag36h11_create = Module.cwrap("tag36h11_create", "number", []);
    this._apriltag_family_destroy = Module.cwrap("apriltag_family_destroy", "void", ["number"]);
    this._set_tag_size = Module.cwrap("set_tag_size", "void", ["number", "number", "number"]);
    this._set_camera_info = Module.cwrap("set_camera_info", "void", ["number", "number", "number", "number"]);
    this._set_detector_options = Module.cwrap("set_detector_options", "void", [
      "number",
      "number",
      "number",
      "number",
      "number",
      "number",
      "number",
    ]);

    // Create the detector
    this._td = this._apriltag_detector_create();

    // Add 36h11 family
    this._tf = this._tag36h11_create();
    this._apriltag_detector_add_family_bits(this._td, this._tf, 1);

    // Set detector options
    this._set_detector_options(
      this._opt.quad_decimate,
      this._opt.quad_sigma,
      this._opt.nthreads,
      this._opt.refine_edges,
      this._opt.max_detections,
      this._opt.return_pose,
      this._opt.return_solutions
    );

    if (this._onDetectorReady) {
      this._onDetectorReady();
    }
  }

  //- Set tag size for pose estimation
  set_tag_size(tag_id, size) {
    this._set_tag_size(this._td, tag_id, size);
  }

  //- Set camera info for pose estimation
  set_camera_info(fx, fy, cx, cy) {
    this._set_camera_info(fx, fy, cx, cy);
  }

  //- Detect tags in a grayscale image
  async detect(grayscale_image, image_width, image_height) {
    if (this._td === undefined) {
      return [];
    }

    const image_buffer_ptr = Module._malloc(image_width * image_height);
    Module.HEAPU8.set(grayscale_image, image_buffer_ptr);

    const image = this._image_u8_create(image_width, image_height);
    Module.setValue(image + 8, image_buffer_ptr, "i32");

    const detections = this._apriltag_detector_detect(this._td, image);
    const result = this._process_detections(detections);

    Module._free(image_buffer_ptr);
    this._image_u8_destroy(image);

    return result;
  }

  _process_detections(detections) {
    const result = [];
    const count = Module.getValue(detections, "i32");

    for (let i = 0; i < count; i++) {
      const detection_ptr = Module.getValue(detections + 4 + i * 4, "i32");
      const id = Module.getValue(detection_ptr + 4, "i32");
      const size = Module.getValue(detection_ptr + 24, "double");

      const center = {
        x: Module.getValue(detection_ptr + 8, "double"),
        y: Module.getValue(detection_ptr + 16, "double"),
      };

      const corners = [];
      for (let j = 0; j < 4; j++) {
        corners.push({
          x: Module.getValue(detection_ptr + 32 + j * 16, "double"),
          y: Module.getValue(detection_ptr + 32 + j * 16 + 8, "double"),
        });
      }

      const pose = {
        R: [],
        t: [],
        e: 0,
        asol: { R: [], t: [], e: 0 },
      };

      if (this._opt.return_pose) {
        const pose_r_ptr = Module.getValue(detection_ptr + 80, "i32");
        const pose_t_ptr = Module.getValue(detection_ptr + 84, "i32");
        pose.e = Module.getValue(detection_ptr + 88, "double");

        for (let j = 0; j < 3; j++) {
          const row = [];
          for (let k = 0; k < 3; k++) {
            row.push(Module.getValue(pose_r_ptr + (j * 3 + k) * 8, "double"));
          }
          pose.R.push(row);
        }

        for (let j = 0; j < 3; j++) {
          pose.t.push(Module.getValue(pose_t_ptr + j * 8, "double"));
        }

        if (this._opt.return_solutions) {
          const asol_r_ptr = Module.getValue(detection_ptr + 96, "i32");
          const asol_t_ptr = Module.getValue(detection_ptr + 100, "i32");
          pose.asol.e = Module.getValue(detection_ptr + 104, "double");

          for (let j = 0; j < 3; j++) {
            const row = [];
            for (let k = 0; k < 3; k++) {
              row.push(Module.getValue(asol_r_ptr + (j * 3 + k) * 8, "double"));
            }
            pose.asol.R.push(row);
          }

          for (let j = 0; j < 3; j++) {
            pose.asol.t.push(Module.getValue(asol_t_ptr + j * 8, "double"));
          }
        }
      }

      result.push({
        id: id,
        size: size,
        center: center,
        corners: corners,
        pose: pose,
      });
    }

    return result;
  }
}
