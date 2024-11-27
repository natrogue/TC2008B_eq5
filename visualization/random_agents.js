'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';
import *  as dataGenerator from './dataGenerator' 
//import {CreateTrafficLight, CreateCar} from './dataGenerator.js';


const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;
in vec2 a_texCoord;

uniform mat4 u_matrix;
out vec4 v_color;
out vec2 v_texCoord;

void main() {
    gl_Position = u_matrix * a_position; // Transform position to clip space
    v_color = a_color;                  // Pass color to fragment shader
    v_texCoord = a_texCoord;
}
`;

// Fragment shader: Outputs flat colors without lighting
const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 outColor;

in vec2 v_texCoord;

uniform sampler2D u_texture;

void main() {
    outColor = v_color; // Use the vertex color directly
    //outColor = texture(u_texture, v_texCoord);

}
`;
class Object3D {
    constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,1,1]){
      this.id = id;
      this.position = position;
      this.rotation = rotation;
      this.scale = scale;
      this.matrix = twgl.m4.create();
    }
  }

const agent_server_url = "http://localhost:8585/";

// Initialize arrays to store car
const cars = [];
const building = [];
const destination = [];
const trafficLight = [];

// Initialize WebGL-related variables
let gl, programInfo, carArrays, carBufferInfo, carVao;
let buildingArrays, buildingBufferInfo, buildingVao;
let destinationArrays, destinationBufferInfo, destinationVao;
let trafficLightArrays, trafficLightBufferInfo, trafficLightVao;
let texture = undefined;

// Camera position
let cameraPosition = { x: 0, y: 10, z: 15 };

// Initialize the frame count
let frameCount = 0;

const data = {
    NAgents: 500,
    width: 100,
    height: 100
  };

// Main function
async function main() {
    const canvas = document.querySelector('canvas');
    gl = canvas.getContext('webgl2');

    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    //agent data
    carArrays = dataGenerator.CreateCar();
    buildingArrays = dataGenerator.CreateBuilding();
    destinationArrays = dataGenerator.CreateDestination();
    trafficLightArrays = dataGenerator.CreateTrafficLight();

     // Create buffer information 
    carBufferInfo = twgl.createBufferInfoFromArrays(gl, carArrays);
    buildingBufferInfo = twgl.createBufferInfoFromArrays(gl, buildingArrays);
    destinationBufferInfo = twgl.createBufferInfoFromArrays(gl, destinationArrays);
    trafficLightBufferInfo = twgl.createBufferInfoFromArrays(gl, trafficLightArrays);

    //create vertex array object (VAOs) from the buffer information
    carVao = twgl.createVAOFromBufferInfo(gl, programInfo, carBufferInfo);
    buildingVao = twgl.createVAOFromBufferInfo(gl, programInfo, buildingBufferInfo);
    destinationVao = twgl.createVAOFromBufferInfo(gl, programInfo, destinationBufferInfo);
    trafficLightVao = twgl.createVAOFromBufferInfo(gl, programInfo, trafficLightBufferInfo);

    //set up the user interface
    setupUI();

    await initAgentsModel();
    await getCars();
    await drawScene(gl, programInfo, carVao, carBufferInfo, buildingVao, buildingBufferInfo, destinationVao, destinationBufferInfo, trafficLightVao, trafficLightBufferInfo);
}

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
  try {
    // Send a POST request to the agent server to initialize the model
    let response = await fetch(agent_server_url + "init",
    {
      method: 'POST', 
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    })

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON and log the message
      let result = await response.json()
      console.log(result.message)
    }
      
  } catch (error) {
    // Log any errors that occur during the request
    console.log(error)    
  }
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

/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getCars() {
    try {
        let response = await fetch(agent_server_url + "getCars");
        if (response.ok) {
            let result = await response.json();
            console.log(result.positions);

            if (cars.length === 0) { // Cambiado de agents a cars
                for (const car of result.positions) {
                    const newCar = new Object3D(car.id, [car.x, car.y, car.z]);
                    cars.push(newCar);
                }
                console.log("Cars:", cars);
            } else {
                for (const car of result.positions) {
                    const currentCar = cars.find((object3d) => object3d.id === car.id);
                    if (currentCar !== undefined) {
                        currentCar.position = [car.x, car.y, car.z];
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}

/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
    try {
      // Send a request to the agent server to update the agent positions
      let response = await fetch(agent_server_url + "update") 
  
      // Check if the response was successful
      if(response.ok){
        // Retrieve the updated agent positions
        //await getAgents()
        await getCars()
        // Log a message indicating that the agents have been updated
        console.log("Updated cars")
      }
  
    } catch (error) {
      // Log any errors that occur during the request
      console.log(error) 
    }
  }


  /*
 * Draws the scene by rendering the agents and obstacles.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {Object} programInfo - The program information.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for obstacles.
 * @param {Object} obstaclesBufferInfo - The buffer information for obstacles.
 */

async function drawScene(gl, programInfo, carVao, carBufferInfo) {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programInfo.program);

    const viewProjectionMatrix = setupWorldView(gl);
    drawCars(1, carVao, carBufferInfo, viewProjectionMatrix);

    frameCount++;
    if (frameCount % 30 === 0) {
        frameCount = 0;
        await update();
    }

    requestAnimationFrame(() => drawScene(gl, programInfo, carVao, carBufferInfo));
}
  

/*
 * Draws the agents.
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawCars(distance, carVao, carBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for agents
    gl.bindVertexArray(carVao);

    // Iterate over the agents
    for(const car of cars){

      // Create the agent's transformation matrix
      const cube_trans = twgl.v3.create(...car.position);
      const cube_scale = twgl.v3.create(...car.scale);

      // Calculate the agent's matrix
      car.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      car.matrix = twgl.m4.rotateX(car.matrix, car.rotation[0]);
      car.matrix = twgl.m4.rotateY(car.matrix, car.rotation[1]);
      car.matrix = twgl.m4.rotateZ(car.matrix, car.rotation[2]);
      car.matrix = twgl.m4.scale(car.matrix, car_scale);

      // Set the uniforms for the agent
      let uniforms = {
          u_matrix: car.matrix,
      }

      // Set the uniforms and draw the agent
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, carBufferInfo);
      
    }
}

function setupWorldView(gl) {
    // Set the field of view (FOV) in radians
    const fov = 45 * Math.PI / 180;

    // Calculate the aspect ratio of the canvas
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Create the projection matrix
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

    // Set the target position
    const target = [data.width/2, 0, data.height/2];

    // Set the up vector
    const up = [0, 1, 0];

    // Calculate the camera position
    const camPos = twgl.v3.create(cameraPosition.x + data.width/2, cameraPosition.y, cameraPosition.z+data.height/2)

    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);

    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    // Return the view-projection matrix
    return viewProjectionMatrix;
}

function setupUI() {
    // Create a new GUI instance
    const gui = new GUI();

    // Create a folder for the camera position
    const posFolder = gui.addFolder('Position:')

    // Add a slider for the x-axis
    posFolder.add(cameraPosition, 'x', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.x = value
        });

    // Add a slider for the y-axis
    posFolder.add( cameraPosition, 'y', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.y = value
        });

    // Add a slider for the z-axis
    posFolder.add( cameraPosition, 'z', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.z = value
        });
}

main()