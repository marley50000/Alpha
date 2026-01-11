document.addEventListener('DOMContentLoaded', () => {
    console.log('Indoor navigation system loaded.');

    const destinationSelect = document.getElementById('destination-select');
    const navigateButton = document.getElementById('navigate-button');
    const instructionsDiv = document.getElementById('instructions');
    const mapContainer = document.getElementById('map-container');

    let svg = null;
    let viewBox = { x: 0, y: 0, width: 800, height: 600 };
    let isPanning = false;
    let startPoint = { x: 0, y: 0 };

    let blueDot, currentPath, currentPathIndex, currentInstructions;
    const STEP_LENGTH = 15; // The distance to move per step, in SVG units
    const PROXIMITY_THRESHOLD = 30; // How close to be to a waypoint to trigger the next instruction

    fetch('map.svg')
        .then(response => response.text())
        .then(svgData => {
            mapContainer.innerHTML = svgData;
            svg = mapContainer.querySelector('svg');
            updateViewBox();
            initializeBlueDot();
            populateDestinations();
        });

    function initializeBlueDot() {
        const startNode = mapGraph.getNodeById('room1');
        if (!svg || !startNode) return;

        blueDot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        blueDot.setAttribute('id', 'user-location');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', 0);
        circle.setAttribute('cy', 0);
        circle.setAttribute('r', 10);
        circle.setAttribute('fill', 'blue');
        circle.setAttribute('stroke', 'white');
        circle.setAttribute('stroke-width', '2');

        const direction = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        direction.setAttribute('d', 'M 0 -15 L 10 0 L -10 0 Z');
        direction.setAttribute('fill', 'blue');

        blueDot.appendChild(circle);
        blueDot.appendChild(direction);
        svg.appendChild(blueDot);

        updateBlueDotPosition(startNode.x, startNode.y);
    }

    function updateBlueDotPosition(x, y) {
        if (blueDot) {
            blueDot.setAttribute('transform', `translate(${x}, ${y}) rotate(0)`);
        }
    }

    function handleOrientation(event) {
        if (blueDot) {
            const alpha = event.alpha || 0; // Compass direction
            const currentTransform = blueDot.getAttribute('transform');
            const newTransform = currentTransform.replace(/rotate\([^)]*\)/, `rotate(${alpha})`);
            blueDot.setAttribute('transform', newTransform);
        }
    }

    function populateDestinations() {
        fetch('locations.json')
            .then(response => response.json())
            .then(locations => {
                locations.forEach(location => {
                    const option = document.createElement('option');
                    option.value = location.id;
                    option.textContent = location.name;
                    destinationSelect.appendChild(option);
                });
            });
    }

    function findPathBFS(startId, endId) {
        const queue = [[startId]];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const nodeId = path[path.length - 1];

            if (nodeId === endId) {
                return path; // Found the path
            }

            const node = mapGraph.getNodeById(nodeId);
            if (node && node.connections) {
                for (const neighborId of node.connections) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        const newPath = [...path, neighborId];
                        queue.push(newPath);
                    }
                }
            }
        }
        return null; // No path found
    }

    function findAndDrawPath(startId, endId) {
        const pathNodeIds = findPathBFS(startId, endId);

        if (pathNodeIds) {
            currentPath = pathNodeIds.map(id => {
                const node = mapGraph.getNodeById(id);
                return { x: node.x, y: node.y };
            });
            currentPathIndex = 0;
            drawPath(currentPath.map(p => [p.x, p.y]));
            generateAndSpeakInstructions(currentPath.map(p => [p.x, p.y]), endId);
        } else {
            console.warn(`No path found from ${startId} to ${endId}`);
            instructionsDiv.textContent = `No path found to ${endId}.`;
        }
    }

    function speak(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    }

    function generateAndSpeakInstructions(path, endId) {
        if (!path || path.length < 2) {
            instructionsDiv.textContent = 'No path found.';
            return;
        }

        currentInstructions = [];
        let currentDirection = Math.atan2(path[1][1] - path[0][1], path[1][0] - path[0][0]);
        let segmentLength = 0;

        for (let i = 1; i < path.length - 1; i++) {
            const nextDirection = Math.atan2(path[i+1][1] - path[i][1], path[i+1][0] - path[i][0]);
            const angleChange = (nextDirection - currentDirection) * (180 / Math.PI);

            segmentLength += Math.hypot(path[i][0] - path[i-1][0], path[i][1] - path[i-1][1]);

            if (Math.abs(angleChange) > 45) { // Threshold for a turn
                currentInstructions.push({ text: `Walk straight for ${Math.round(segmentLength / 10)} meters.`, waypoint: i });
                if (angleChange > 0) {
                    currentInstructions.push({ text: 'Turn right.', waypoint: i });
                } else {
                    currentInstructions.push({ text: 'Turn left.', waypoint: i });
                }
                currentDirection = nextDirection;
                segmentLength = 0;
            }
        }

        segmentLength += Math.hypot(path[path.length - 1][0] - path[path.length - 2][0], path[path.length - 1][1] - path[path.length - 2][1]);
        currentInstructions.push({ text: `Walk straight for ${Math.round(segmentLength / 10)} meters.`, waypoint: path.length - 1 });
        currentInstructions.push({ text: `You have arrived at your destination: ${endId}.`, waypoint: path.length - 1 });

        speakNextInstruction();
    }

    function speakNextInstruction() {
        if (currentInstructions && currentInstructions.length > 0) {
            const instruction = currentInstructions.shift();
            instructionsDiv.textContent = instruction.text;
            speak(instruction.text);
        }
    }

    function drawPath(path) {
        // Clear previous path
        const existingPath = svg.querySelector('#nav-path');
        if (existingPath) {
            existingPath.remove();
        }

        if (!path || path.length === 0) return;

        const points = path.map(p => `${p[0]},${p[1]}`).join(' ');
        const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('id', 'nav-path');
        polyline.setAttribute('points', points);
        polyline.setAttribute('fill', 'none');
        polyline.setAttribute('stroke', 'blue');
        polyline.setAttribute('stroke-width', '5');
        polyline.setAttribute('stroke-dasharray', '10,5');
        svg.appendChild(polyline);
    }

    // --- Event Listeners and UI ---

    const startTrackingButton = document.getElementById('start-tracking-button');
    const opticalSyncButton = document.getElementById('optical-sync-button');

    opticalSyncButton.addEventListener('click', () => {
        window.location.href = 'apriltag.html';
    });

    window.addEventListener('storage', (event) => {
        if (event.key === 'optical-sync-location' && event.newValue) {
            const location = JSON.parse(event.newValue);
            updateBlueDotPosition(location.x, location.y);
            localStorage.removeItem('optical-sync-location'); // Clean up
        }
    });

    navigateButton.addEventListener('click', () => {
        // For now, hardcode start and use dropdown for end
        const startId = 'room1';
        const endId = destinationSelect.value;
        if (endId) {
            findAndDrawPath(startId, endId);
        }
    });

    startTrackingButton.addEventListener('click', () => {
        // Request permissions for both orientation and motion
        const orientationPromise = typeof DeviceOrientationEvent.requestPermission === 'function'
            ? DeviceOrientationEvent.requestPermission()
            : Promise.resolve('granted');

        const motionPromise = typeof DeviceMotionEvent.requestPermission === 'function'
            ? DeviceMotionEvent.requestPermission()
            : Promise.resolve('granted');

        Promise.all([orientationPromise, motionPromise])
            .then(permissions => {
                if (permissions.every(p => p === 'granted')) {
                    window.addEventListener('deviceorientation', handleOrientation);
                    window.addEventListener('devicemotion', handleMotion);
                    startTrackingButton.style.display = 'none';
                } else {
                    alert('Permission for device orientation and/or motion was denied.');
                }
            })
            .catch(console.error);
    });

    let lastAccel = 0;
    let isStepInProgress = false;
    function handleMotion(event) {
        const accel = event.accelerationIncludingGravity;
        const magnitude = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);

        // Simple threshold-based step detection
        if (magnitude > 11.5 && !isStepInProgress) {
            isStepInProgress = true;
            handleStep();
        } else if (magnitude < 9.0) {
            isStepInProgress = false;
        }
        lastAccel = magnitude;
    }

    function handleStep() {
        if (!currentPath || currentPathIndex >= currentPath.length - 1) return;

        // Simplified: Move to the next node in the path
        currentPathIndex++;
        const nextPosition = currentPath[currentPathIndex];
        updateBlueDotPosition(nextPosition.x, nextPosition.y);

        // Check for proximity to the next instruction's waypoint
        if (currentInstructions.length > 0) {
            const nextInstructionWaypoint = currentPath[currentInstructions[0].waypoint];
            const distance = Math.hypot(nextPosition.x - nextInstructionWaypoint.x, nextPosition.y - nextInstructionWaypoint.y);

            if (distance < PROXIMITY_THRESHOLD) {
                speakNextInstruction();
            }
        }
    }

    function updateViewBox() {
        if (svg) {
            svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
        }
    }

    mapContainer.addEventListener('mousedown', (e) => {
        isPanning = true;
        startPoint = { x: e.clientX, y: e.clientY };
    });

    mapContainer.addEventListener('mouseup', () => {
        isPanning = false;
    });

    mapContainer.addEventListener('mouseleave', () => {
        isPanning = false;
    });

    mapContainer.addEventListener('mousemove', (e) => {
        if (!isPanning || !svg) return;
        const dx = (startPoint.x - e.clientX) * (viewBox.width / svg.clientWidth);
        const dy = (startPoint.y - e.clientY) * (viewBox.height / svg.clientHeight);
        viewBox.x += dx;
        viewBox.y += dy;
        startPoint = { x: e.clientX, y: e.clientY };
        updateViewBox();
    });

    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!svg) return;

        const zoomFactor = 1.1;
        const { clientX, clientY } = e;
        const svgRect = svg.getBoundingClientRect();
        const svgX = clientX - svgRect.left;
        const svgY = clientY - svgRect.top;

        const scaleX = svgX / svg.clientWidth;
        const scaleY = svgY / svg.clientHeight;

        const newWidth = e.deltaY > 0 ? viewBox.width * zoomFactor : viewBox.width / zoomFactor;
        const newHeight = e.deltaY > 0 ? viewBox.height * zoomFactor : viewBox.height / zoomFactor;

        viewBox.x += (viewBox.width - newWidth) * scaleX;
        viewBox.y += (viewBox.height - newHeight) * scaleY;
        viewBox.width = newWidth;
        viewBox.height = newHeight;

        updateViewBox();
    });
});