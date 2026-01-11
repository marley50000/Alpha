# Indoor Navigation System with AprilTag Optical Sync

This is a web-based indoor navigation system that uses a custom pathfinding engine, device sensors, and AprilTag detection for real-time location tracking and correction.

## Features

- **Custom Pathfinding:** Uses a self-contained Breadth-First Search (BFS) algorithm to find the shortest path on a pre-defined map.
- **Interactive SVG Map:** Displays an SVG map with pan and zoom controls.
- **Pedestrian Dead Reckoning (PDR):** Tracks the user's position and orientation using the device's motion and orientation sensors.
- **Proximity-Triggered TTS:** Provides turn-by-turn audio instructions as the user approaches waypoints.
- **Optical Sync:** Uses AprilTag detection to recalibrate the user's position on the map, correcting for sensor drift.

## Running Locally

1. **Start a local web server:**
   ```bash
   python3 -m http.server
   ```
2. **Open the application:**
   Navigate to `http://localhost:8000/navigation.html` in your web browser.

## Deployment to Vercel

This project can be deployed to Vercel. The `vercel.json` file in the root directory ensures that the `navigation.html` page is served as the main entry point.

1. **Install the Vercel CLI:**
   ```bash
   npm install -g vercel
   ```
2. **Deploy the project:**
   From the root of the project, run the `vercel` command:
   ```bash
   vercel
   ```
   Follow the on-screen prompts to deploy the application.
