'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';

// Vertex shader
const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;
uniform mat4 u_matrix;
out vec4 v_color;
void main() {
    gl_Position = u_matrix * a_position;
    v_color = a_color;
}
`;

// Fragment shader
const fsGLSL = `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() {
    outColor = v_color;
}
`;

// WebGL-related variables
let gl, programInfo;

// Camera position
let cameraPosition = { x: 0, y: 10, z: 15 };

// Objects mapping: symbol -> .obj file and color
const objects = {
    "S": { path: "objs/traffic_light.obj", color: [1, 0, 0] },       // Red for traffic light
    "s": { path: "objs/semaforo.obj", color: [0, 1, 0] }, // Green for small traffic light
    "#": { path: "objs/building.obj", color: [0.5, 0.5, 0.5] },      // Gray for buildings
    "7": { path: "objs/semaforo.obj", color: [0, 1, 0] },
    "15": { path: "objs/semaforo.obj", color: [1, 0, 0] },
    "Obstacle": { path: "objs/building.obj", color: [0.5, 0.5, 0.5] },
    "Destination": { path: "objs/destino.obj", color: [0, 0, 1] }, // Blue for destinations
};

// Main function
async function main() {
    const canvas = document.querySelector('canvas');
    gl = canvas.getContext('webgl2');

    if (!gl) {
        console.error("WebGL2 not supported in this browser.");
        return;
    }

    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    // Fetch the map layout
    const mapLayout = await fetchMapLayout();
    if (!mapLayout) {
        console.error("Map layout could not be fetched.");
        return;
    }

    // Generate positions and colors from the map layout
    const { positions, colors } = await generateObjectsFromMap(mapLayout, objects);

    // Create buffer information for WebGL
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
        a_position: { numComponents: 3, data: positions },
        a_color: { numComponents: 3, data: colors },
    });

    setupUI(); // Add GUI for camera controls
    drawScene(bufferInfo); // Render the scene
}


// Fetch map layout
async function fetchMapLayout() {
    try {
        const response = await fetch("map_layout.json");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const mapLayout = await response.json();
        console.log("Map layout fetched:", mapLayout);
        return mapLayout;
    } catch (error) {
        console.error("Failed to fetch map layout:", error);
        return null;
    }
}

// Generate positions and colors from the map layout
async function generateObjectsFromMap(mapLayout, objects) {
    const positions = [];
    const colors = [];

    for (const element of mapLayout) {
        const { type, position } = element;

        if (!objects[type]) {
            console.warn(`No object mapping found for type: ${type}`);
            continue;
        }

        const { path, color } = objects[type];

        // Load the OBJ file for the given type
        try {
            const objData = await loadObjFromFile(path);

            if (objData) {
                const [x, y, z] = position;

                // Adjust vertex positions based on map position
                for (let i = 0; i < objData.a_position.data.length; i += 3) {
                    positions.push(
                        objData.a_position.data[i] + x,    // Adjust X
                        objData.a_position.data[i + 1] + y, // Adjust Y
                        objData.a_position.data[i + 2] + z  // Adjust Z
                    );
                }

                // Generate uniform colors for the object
                colors.push(...generateUniformColors(objData.a_position.data.length / 3, color));
            }
        } catch (error) {
            console.error(`Failed to process object for type: ${type}`, error);
        }
    }

    return { positions, colors };
}

// Load OBJ data from a file
async function loadObjFromFile(path) {
    try {
        const response = await fetch(path);
        const text = await response.text();
        return parseOBJ(text); // Use a custom OBJ parser
    } catch (error) {
        console.error(`Error loading OBJ file at ${path}:`, error);
        return null;
    }
}

// Parse OBJ file into vertex positions
function parseOBJ(objText) {
    const lines = objText.split('\n');
    const positions = [];

    for (let line of lines) {
        line = line.trim();

        // Process vertex positions (lines that start with 'v ')
        if (line.startsWith('v ')) {
            const [, x, y, z] = line.split(/\s+/);
            positions.push(parseFloat(x), parseFloat(y), parseFloat(z));
        }
    }

    return {
        a_position: { data: positions }, // Return vertex positions
    };
}

// Generate uniform colors for vertices
function generateUniformColors(vertexCount, color) {
    const colors = [];
    for (let i = 0; i < vertexCount; i++) {
        colors.push(...color);
    }
    return colors;
}

// Create a perspective view matrix
function createPerspectiveViewMatrix() {
    const fov = (45 * Math.PI) / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 100);

    const eye = [cameraPosition.x, cameraPosition.y, cameraPosition.z];
    const target = [0, 0, 0];
    const up = [0, 1, 0];
    const cameraMatrix = twgl.m4.lookAt(eye, target, up);
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    return twgl.m4.multiply(projectionMatrix, viewMatrix);
}

// Draw the WebGL scene
function drawScene(bufferInfo) {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1); // Background color
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    const uniforms = {
        u_matrix: createPerspectiveViewMatrix(),
    };

    twgl.setUniforms(programInfo, uniforms);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    gl.drawArrays(gl.TRIANGLES, 0, bufferInfo.numElements);

    requestAnimationFrame(() => drawScene(bufferInfo));
}

// Setup GUI for camera controls
function setupUI() {
    const gui = new GUI();
    const posFolder = gui.addFolder('Camera Position');

    posFolder.add(cameraPosition, 'x', -50, 50).listen();
    posFolder.add(cameraPosition, 'y', 0, 50).listen();
    posFolder.add(cameraPosition, 'z', 0, 50).listen();
}

// Run the main function
main();
