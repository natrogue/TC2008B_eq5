'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';
import *  as dataGenerator from './dataGenerator' 
//import {CreateTrafficLight, CreateCar} from './dataGenerator.js';


const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;
uniform vec4 u_color;
in vec2 a_texCoord;

uniform mat4 u_matrix;
out vec4 v_color;
out vec2 v_texCoord;

void main() {
    gl_Position = u_matrix * a_position; // Transform position to clip space
    v_color = u_color;                  // Pass color to fragment shader
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
const buildings = [];
const destinations = [];
const trafficLights = [];

// Initialize WebGL-related variables
let gl, programInfo, carArrays, carBufferInfo, carVao;
let buildingArrays, buildingBufferInfo, buildingVao;
let destinationArrays, destinationBufferInfo, destinationVao;
let trafficLightArrays, trafficLightBufferInfo, trafficLightVao;
let texture = undefined;

let cameraPosition = { x: 0, y: 20, z:0 };

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
    await update();
    await getCars();
    await getTraffic_Light();
    await getBuilding();
    await getDestination();
    await drawScene(gl, programInfo, carVao, carBufferInfo, buildingVao, buildingBufferInfo, destinationVao, destinationBufferInfo, trafficLightVao, trafficLightBufferInfo);
}

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

async function getTraffic_Light() {
    try {
        let response = await fetch(agent_server_url + "getTraffic_Light");
        if (response.ok) {
            let result = await response.json();
            console.log(result.positions);

            if (trafficLights.length === 0) { // Cambiado de agents a cars
                for (const traffic_light of result.positions) {
                    const newtrafficLights = new Object3D(traffic_light.id, [traffic_light.x, traffic_light.y, traffic_light.z]);
                    newtrafficLight.state = traffic_light.state;
                    trafficLights.push(newtrafficLights);
                }
                console.log("trafficLights:", trafficLights);
            } else {
                for (const trafficLight of result.positions) {
                    const currenttrafficLight = cars.find((object3d) => object3d.id === trafficLight.id);
                    if (currenttrafficLight !== undefined) {
                        currenttrafficLight.position = [trafficLight.x, trafficLight.y, trafficLight.z];
                        currenttrafficLight.state = trafficLight.state;
                    }
                }
            }
        }
    } catch (error) {
        console.log(error);
    }
}

async function getBuilding() {
    try {
      let response = await fetch(agent_server_url + "getBuildings") 
      if(response.ok){
            let result = await response.json()
        for (const building of result.positions) { // 'building' is redeclared here as a loop variable
            const newBuilding = new Object3D(building.id, [building.x, building.y, building.z]);
            buildings.push(newBuilding); // Attempting to call `push` on a redeclared `building`
        }
        console.log("building:", buildings)
      }
    } catch (error) {
      console.log(error) 
    }
  }
  
async function getDestination() {
    try {
      let response = await fetch(agent_server_url + "getDestinations") 
      if(response.ok){
            let result = await response.json()
        for (const destinations of result.positions) {
            const newDestionation = new Object3D(destination.id, [destination.x, destination.y, destination.z])
            destinations.push(newDestionation)
            }
        console.log("building:", buildings)
      }
    } catch (error) {
      console.log(error) 
    }
  }
  

async function update() {
    try {
      let response = await fetch(agent_server_url + "update") 
      if(response.ok){
        await getCars();
        //await getDestination()
        await getTraffic_Light()


        await getBuilding();
        console.log("Updated cars")
      }
  
    } catch (error) {
      console.log(error) 
    }
  }

async function drawScene(gl, programInfo, carVao, carBufferInfo) {
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(programInfo.program);

    const viewProjectionMatrix = setupWorldView(gl);
    drawCars(1, carVao, carBufferInfo, viewProjectionMatrix);
    drawTraffic_Light(1, trafficLightVao, trafficLightBufferInfo, viewProjectionMatrix);
    drawBuildings(buildingVao, buildingBufferInfo, viewProjectionMatrix);
    drawDestinations(destinationVao, destinationBufferInfo, viewProjectionMatrix);


    frameCount++;

    if (frameCount % 30 === 0) {
        frameCount = 0;
        await update();
    }
    requestAnimationFrame(() => drawScene(gl, programInfo, carVao, carBufferInfo));
    }
  
function drawCars(distance, carVao, carBufferInfo, viewProjectionMatrix){
    gl.bindVertexArray(carVao);
    for(const car of cars){
      const cube_trans = twgl.v3.create(...car.position);
      const cube_scale = twgl.v3.create(...car.scale);

      // Calculate the agent's matrix
      car.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      car.matrix = twgl.m4.rotateX(car.matrix, car.rotation[0]);
      car.matrix = twgl.m4.rotateY(car.matrix, car.rotation[1]);
      car.matrix = twgl.m4.rotateZ(car.matrix, car.rotation[2]);
      //car.matrix = twgl.m4.scale(car.matrix, car_scale);
      // Set the uniforms for the agent
      let uniforms = {
          u_matrix: car.matrix,
          u_color: [1,0,0,1]
      }
      // Set the uniforms and draw the agent
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, carBufferInfo);
    }
    }

function drawTraffic_Light(distance, trafficLightVao, carBufferInfo, trafficLightBufferInfo, viewProjectionMatrix){
    gl.bindVertexArray(trafficLightVao);
    for(const trafficLight of trafficLights){
      const cube_trans = twgl.v3.create(...trafficLight.position);
      const cube_scale = twgl.v3.create(...trafficLight.scale);

      // Calculate the agent's matrix
      trafficLight.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      trafficLight.matrix = twgl.m4.rotateX(trafficLight.matrix, trafficLight.rotation[0]);
      trafficLight.matrix = twgl.m4.rotateY(trafficLight.matrix, trafficLight.rotation[1]);
      trafficLight.matrix = twgl.m4.rotateZ(trafficLight.matrix, trafficLight.rotation[2]);
      //car.matrix = twgl.m4.scale(car.matrix, car_scale);

      let color;
      if (trafficLight.state === agent.state){
        color = [1,0,0,1];
      } else if (trafficLight.state === "green"){
        color = [1,1,0,1];
      }

      // Set the uniforms for the agent
      let uniforms = {
          u_matrix: trafficLight.matrix,
          u_color: color
      }

      // Set the uniforms and draw the agent
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, trafficLightBufferInfo);
      
    }
    }

function drawBuildings(buildingVao, buildingBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for obstacles
    gl.bindVertexArray(buildingVao);

    // Iterate over the obstacles
    for(const building of buildings){
      // Create the obstacle's transformation matrix
      const cube_trans = twgl.v3.create(...building.position);
      const cube_scale = twgl.v3.create(...building.scale);

      // Calculate the obstacle's matrix
      building.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      building.matrix = twgl.m4.rotateX(building.matrix, building.rotation[0]);
      building.matrix = twgl.m4.rotateY(building.matrix, building.rotation[1]);
      building.matrix = twgl.m4.rotateZ(building.matrix, building.rotation[2]);
      //building.matrix = twgl.m4.scale(obstacle.matrix, cube_scale);

      // Set the uniforms for the obstacle
      let uniforms = {
          u_matrix: building.matrix,
          u_color: [1,1,0,1]
      }

      // Set the uniforms and draw the obstacle
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, buildingBufferInfo);
      
    }
}

function drawDestinations(destinationVao, destinationBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for obstacles
    gl.bindVertexArray(destinationVao);

    // Iterate over the obstacles
    for(const destination of destinations){
      // Create the obstacle's transformation matrix
      const cube_trans = twgl.v3.create(...destination.position);
      const cube_scale = twgl.v3.create(...destination.scale);

      // Calculate the obstacle's matrix
      destination.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      destination.matrix = twgl.m4.rotateX(destination.matrix, destination.rotation[0]);
      destination.matrix = twgl.m4.rotateY(destination.matrix, destination.rotation[1]);
      destination.matrix = twgl.m4.rotateZ(destination.matrix, destination.rotation[2]);
      //building.matrix = twgl.m4.scale(obstacle.matrix, cube_scale);

      // Set the uniforms for the obstacle
      let uniforms = {
          u_matrix: destination.matrix,
      }

      // Set the uniforms and draw the obstacle
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, destinationBufferInfo);
      
    }
}


function setupWorldView(gl) {
    const fov = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);
    //const target = [data.width/2, 0, data.height/2 ];
    const target = [0, 0, 0 ];
    const up = [0, 1, 0];// Set the up vector

    // Calculate the camera position
    const camPos = twgl.v3.create(cameraPosition.x + data.width/2, cameraPosition.y, cameraPosition.z+data.height/2)
    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);
    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);
    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    return viewProjectionMatrix;
}

function setupUI() {
    const gui = new GUI();

    const posFolder = gui.addFolder('Position:')

    posFolder.add(cameraPosition, 'x', -50, 50)
        .onChange( value => {
            cameraPosition.x = value
        });

    posFolder.add( cameraPosition, 'y', -50, 50)
        .onChange( value => {
            cameraPosition.y = value
        });

    posFolder.add( cameraPosition, 'z', -50, 50)
        .onChange( value => {
            cameraPosition.z = value
        });
}

main()
