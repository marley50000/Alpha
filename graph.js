// A simple representation of the map's walkable areas.
// Each node has an ID, x/y coordinates, and a list of connected nodes.
const graph = {
    nodes: [
        { id: 'room1', x: 150, y: 150, connections: ['corridor_west'] },
        { id: 'room2', x: 375, y: 150, connections: ['corridor_mid_north'] },
        { id: 'room3', x: 625, y: 150, connections: ['corridor_east'] },
        { id: 'room4', x: 375, y: 500, connections: ['corridor_mid_south'] },
        { id: 'room5', x: 625, y: 350, connections: ['corridor_east'] },

        { id: 'corridor_west', x: 150, y: 300, connections: ['room1', 'corridor_mid'] },
        { id: 'corridor_mid_north', x: 375, y: 250, connections: ['room2', 'corridor_mid'] },
        { id: 'corridor_mid', x: 375, y: 300, connections: ['corridor_west', 'corridor_mid_north', 'corridor_mid_south', 'corridor_east'] },
        { id: 'corridor_mid_south', x: 375, y: 400, connections: ['room4', 'corridor_mid'] },
        { id: 'corridor_east', x: 625, y: 300, connections: ['room3', 'room5', 'corridor_mid'] }
    ],

    getNodeById(id) {
        return this.nodes.find(node => node.id === id);
    }
};

// This makes the graph available to other scripts if using modules,
// but for now we'll just include it before navigation.js
window.mapGraph = graph;
