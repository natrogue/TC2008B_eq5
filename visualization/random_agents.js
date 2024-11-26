'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';


const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;
uniform mat4 u_matrix;
out vec4 v_color;

void main() {
    gl_Position = u_matrix * a_position; // Transform position to clip space
    v_color = a_color;                  // Pass color to fragment shader
}
`;

// Fragment shader: Outputs flat colors without lighting
const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 outColor;

void main() {
    outColor = v_color; // Use the vertex color directly
}
`;

// WebGL-related variables
let gl, programInfo;

// Camera position
let cameraPosition = { x: 0, y: 10, z: 15 };

// Object mapping: Symbol -> .obj file and color
const objects = {
    "S": { path: "objs/semaforo.obj", color: [1, 0, 0] },       // Red traffic light
    "s": { path: "objs/semaforo.obj", color: [0, 1, 0] },           // Green small traffic light
    "#": { path: "objs/building.obj", color: [0.5, 0.5, 0.5] },     // Gray buildings
    "7": { path: "objs/semaforo.obj", color: [0, 1, 0] },
    "15": { path: "objs/semaforo.obj", color: [1, 0, 0] },
    "Obstacle": { path: "objs/building.obj", color: [0.5, 0.5, 0.5] },
    "Destination": { path: "objs/destino.obj", color: [0, 0, 1] },   // Blue destinations
    // ">": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] }, // Gris oscuro para carretera
    // "<": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    // "^": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    // "v": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    // "Down": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    // "Up": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    // "Left": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    // "Right": { path: "objs/road.obj", color: [0.3, 0.3, 0.3] },
    

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
            let objData = await loadObjFromFile(path);

            if (objData) {
                objData = recenterAndScaleModel(objData); // Recenter and scale model
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

function parseOBJ(objData) {
  const positions = [];
  const normals = [];
  const texCoords = [];
  const positionData = [];
  const normalData = [];
  const texCoordData = [];
  const colorData = [];

  const lines = objData.split('\n');
  lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const type = parts[0];
      
      switch(type) {
          case 'v':  
              positions.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
              break;
          case 'vn': 
              normals.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])]);
              break;
          case 'vt':  
              texCoords.push([parseFloat(parts[1]), parseFloat(parts[2])]);
              break;
          case 'f': 
              const faceVertices = parts.slice(1).map(v => v.split('/').map(n => parseInt(n) - 1));
              for (let i = 1; i < faceVertices.length - 1; i++) {
                  const triangle = [faceVertices[0], faceVertices[i], faceVertices[i + 1]];
                  
                  triangle.forEach(([vIdx, vtIdx, vnIdx]) => {
                      const [vx, vy, vz] = positions[vIdx];
                      positionData.push(vx, vy, vz);

                      if (vnIdx !== undefined && normals[vnIdx]) {
                          const [nx, ny, nz] = normals[vnIdx];
                          normalData.push(nx, ny, nz);
                      } else {
                          normalData.push(0, 0, 1); 
                      }

                      if (vtIdx !== undefined && texCoords[vtIdx]) {
                          const [tx, ty] = texCoords[vtIdx];
                          texCoordData.push(tx, ty);
                      } else {
                          texCoordData.push(0, 0);  
                      }
                      colorData.push(0.4, 0.4, 0.4, 1.0);
                  });
              }
              break;
      }
  });

  return {
      a_position: { numComponents: 3, data: positionData },
      a_color: { numComponents: 4, data: colorData },
      a_normal: { numComponents: 3, data: normalData },
      a_texCoord: { numComponents: 2, data: texCoordData }
  };
}

// Recenter and scale the model
function recenterAndScaleModel(objData) {
    const positions = objData.a_position.data;
    let minY = Infinity, maxY = -Infinity;

    // Find min and max Y values
    for (let i = 1; i < positions.length; i += 3) {
        minY = Math.min(minY, positions[i]);
        maxY = Math.max(maxY, positions[i]);
    }

    const centerY = (minY + maxY) / 2; // Find the center along the Y-axis
    const scaleFactor = 0.5;           // Scale down the model by half

    // Adjust Y positions and scale all axes
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] *= scaleFactor;       // Scale X
        positions[i + 1] = (positions[i + 1] - centerY) * scaleFactor; // Scale and recenter Y
        positions[i + 2] *= scaleFactor;  // Scale Z
    }

    return objData;
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