const graph = {
    nodes: [
        // Entrances
        { id: 'entrance', x: 500, y: 650, connections: ['main_aisle_south'] },
        { id: 'produce_entrance', x: 200, y: 220, connections: ['produce_main', 'side_aisle_west_mid'] },
        { id: 'bakery_entrance', x: 800, y: 220, connections: ['bakery_main', 'side_aisle_east_mid'] },
        { id: 'electronics_entrance', x: 200, y: 480, connections: ['electronics_main', 'side_aisle_west_mid'] },
        { id: 'pharmacy_entrance', x: 800, y: 480, connections: ['pharmacy_main', 'side_aisle_east_mid'] },

        // Main Aisle
        { id: 'main_aisle_south', x: 500, y: 620, connections: ['entrance', 'main_aisle_mid_south'] },
        { id: 'main_aisle_mid_south', x: 500, y: 400, connections: ['main_aisle_south', 'main_aisle_mid_north', 'aisle4_mid'] },
        { id: 'main_aisle_mid_north', x: 500, y: 200, connections: ['main_aisle_mid_south', 'main_aisle_north', 'aisle2_mid'] },
        { id: 'main_aisle_north', x: 500, y: 50, connections: ['main_aisle_mid_north', 'aisle1_mid'] },

        // Side Aisles
        { id: 'side_aisle_west_top', x: 275, y: 80, connections: ['side_aisle_west_mid', 'aisle1_west'] },
        { id: 'side_aisle_west_mid', x: 275, y: 350, connections: ['side_aisle_west_top', 'side_aisle_west_bottom', 'produce_entrance', 'electronics_entrance', 'aisle3_west'] },
        { id: 'side_aisle_west_bottom', x: 275, y: 620, connections: ['side_aisle_west_mid', 'aisle5_west'] },
        { id: 'side_aisle_east_top', x: 725, y: 80, connections: ['side_aisle_east_mid', 'aisle1_east'] },
        { id: 'side_aisle_east_mid', x: 725, y: 350, connections: ['side_aisle_east_top', 'side_aisle_east_bottom', 'bakery_entrance', 'pharmacy_entrance', 'aisle3_east'] },
        { id: 'side_aisle_east_bottom', x: 725, y: 620, connections: ['side_aisle_east_mid', 'aisle5_east'] },

        // Shelf Aisles (intersections)
        { id: 'aisle1_west', x: 350, y: 115, connections: ['side_aisle_west_top', 'aisle1_mid'] },
        { id: 'aisle1_mid', x: 500, y: 115, connections: ['aisle1_west', 'aisle1_east', 'main_aisle_north'] },
        { id: 'aisle1_east', x: 650, y: 115, connections: ['aisle1_mid', 'side_aisle_east_top'] },

        { id: 'aisle2_west', x: 350, y: 185, connections: ['aisle2_mid'] },
        { id: 'aisle2_mid', x: 500, y: 185, connections: ['aisle2_west', 'aisle2_east', 'main_aisle_mid_north'] },
        { id: 'aisle2_east', x: 650, y: 185, connections: ['aisle2_mid'] },

        { id: 'aisle3_west', x: 350, y: 395, connections: ['side_aisle_west_mid', 'aisle3_mid'] },
        { id: 'aisle3_mid', x: 500, y: 395, connections: ['aisle3_west', 'aisle3_east', 'main_aisle_mid_south'] },
        { id: 'aisle3_east', x: 650, y: 395, connections: ['aisle3_mid', 'side_aisle_east_mid'] },

        { id: 'aisle4_west', x: 350, y: 535, connections: ['aisle4_mid'] },
        { id: 'aisle4_mid', x: 500, y: 535, connections: ['aisle4_west', 'aisle4_east', 'main_aisle_mid_south'] },
        { id: 'aisle4_east', x: 650, y: 535, connections: ['aisle4_mid'] },

        { id: 'aisle5_west', x: 350, y: 605, connections: ['side_aisle_west_bottom', 'aisle5_mid'] },
        { id: 'aisle5_mid', x: 500, y: 605, connections: ['aisle5_west', 'aisle5_east'] },
        { id: 'aisle5_east', x: 650, y: 605, connections: ['aisle5_mid', 'side_aisle_east_bottom'] },

        // In-store locations
        { id: 'produce_main', x: 150, y: 125, connections: ['produce_entrance'] },
        { id: 'bakery_main', x: 850, y: 125, connections: ['bakery_entrance'] },
        { id: 'electronics_main', x: 150, y: 575, connections: ['electronics_entrance'] },
        { id: 'pharmacy_main', x: 850, y: 575, connections: ['pharmacy_entrance'] }
    ],

    getNodeById(id) {
        return this.nodes.find(node => node.id === id);
    }
};

window.mapGraph = graph;
