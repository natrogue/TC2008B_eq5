'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';
import *  as dataGenerator from './dataGenerator' 
//import {CreateTrafficLight, CreateCar} from './dataGenerator.js';

import vsGLSL from "./assets/shaders/vs_phong_301.glsl?raw";
import fsGLSL from "./assets/shaders/fs_phong_301.glsl?raw";

class Object3D {
    constructor(
        id, 
        position=[0,0,0], 
        rotation=[0,0,0], 
        scale=[1,1,1]
    ) {
      this.id = id;
      this.position = position;
      this.rotation = rotation;
      this.scale = scale;
      this.matrix = twgl.m4.create();
    }
  }

const agent_server_url = "http://localhost:8585/";

// Initialize arrays to store car
//const cars = [];
let cars =[];
const buildings = [];
const roads =[];
const destinations = [];
const trafficLights = [];

// Initialize WebGL-related variables
let gl, programInfo, carArrays, carBufferInfo, carVao;
let buildingArrays, buildingBufferInfo, buildingVao;
let roadArrays, roadBufferInfo, roadVao;
let destinationArrays, destinationBufferInfo, destinationVao;
let trafficLightArrays, trafficLightBufferInfo, trafficLightVao;
let texture = undefined;

let cameraPosition = { x: -5.5, y: 16.9, z:-26.9 };

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
    //roadArrays = dataGenerator.CreateRoad();
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
    //await getRoad();
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
      // Enviar una solicitud GET al servidor de agentes para obtener las posiciones
      let response = await fetch(agent_server_url + "getCars");
      let rotation = [0, 0, 0];
      
      if (response.ok) { // Verificar si la respuesta fue exitosa
        let result = await response.json();// Analizar la respuesta como JSON
        console.log(result.positions);// Registrar las posiciones de los agentes
        
        const receivedIds = result.positions.map((car) => car.id);// ids de los agentes
        cars = cars.filter((object3d) => receivedIds.includes(object3d.id));// Eliminar agentes 
  
        
        for (const car of result.positions) { // Agregar cars o actualizar 
          const existingCar = cars.find(
            (object3d) => object3d.id === car.id,
          );
            if (car.direction == "Up") {
            rotation = [0, 0, 0];
          } else if (car.direction == "Down") {
            rotation = [0, Math.PI, 0];
          } else if (car.direction == "Left") {
            rotation = [0, -Math.PI / 2, 0];
          } else if (car.direction == "Right") {
            rotation = [0, Math.PI / 2, 0];
          } else {
            rotation = [0, 0, 0];
          }
  
          if (!existingCar) {
            // Crear un nuevo car
            const newCar = new Object3D(
              car.id, [car.x, car.y, car.z],
              rotation, [0.6, 0.8, 0.6]
            ); //se agrega al array
            cars.push(newCar);
          } else {
            // actualiza la posición y rotación 
            existingCar.position = [car.x, car.y, car.z];
            existingCar.rotation = rotation;
          }
        }
        console.log("Agents:", cars);
      } else {
        console.error("Failed to fetch agents:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }
  

async function getTraffic_Light() {
    try {
        let response = await fetch(agent_server_url + "getTraffic_Light");
        if (response.ok) {
            let result = await response.json();
            console.log(result.positions);

            if (trafficLights.length === 0) { 
                for (const traffic_light of result.positions) {
                    const newtrafficLights = new Object3D(traffic_light.id, [traffic_light.x, traffic_light.y, traffic_light.z]);
                    trafficLights.push(newtrafficLights);
                }
                console.log("trafficLights:", trafficLights);
            } else {
                for (const trafficLight of result.positions) {
                    const currentTrafficLight = trafficLights.find((object3d) => object3d.id === trafficLight.id);
                    if (currentTrafficLight !== undefined) {
                        currentTrafficLight.position = [trafficLight.x, trafficLight.y, trafficLight.z];
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

//   async function getRoad() {
//     try {
//       // Send a GET request to the agent server to retrieve the road positions
//       let response = await fetch(agent_server_url + "getRoads");
  
//       // Check if the response was successful
//       if (response.ok) {
//         // Parse the response as JSON
//         let result = await response.json();
  
//         // Create new roads and add them to the roads array
//         for (const road of result.positions) {
//           const newRoad = new Object3D(
//             road.id,
//             [road.x, road.y, road.z],
//             [0, 0, 0],
//             [1, 0.2, 1],
//           ); // Dark gray color
//           roads.push(newRoad);
//         }
//         // Log the roads array
//         console.log("Roads:", roads);
//       }
//     } catch (error) {
//       // Log any errors that occur during the request
//       console.log(error);
//     }
//   }
async function getDestination() {
    try {
      let response = await fetch(agent_server_url + "getDestinations") 
      if(response.ok){
            let result = await response.json()
        for (const destination of result.positions) {
            const newDestionation = new Object3D(destination.id, [destination.x, destination.y, destination.z])
            destinations.push(newDestionation)
            }
        console.log("destination:", destinations)
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
        //await getRoad();
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
    drawRoads(roadVao, roadBufferInfo, viewProjectionMatrix);
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

function drawTraffic_Light(distance, trafficLightVao, carBufferInfo, viewProjectionMatrix){
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

      // Set the uniforms for the agent
      let uniforms = {
          u_matrix: trafficLight.matrix,
          u_color: [0,0,1,1]
      }

      // Set the uniforms and draw the agent
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, carBufferInfo);
      
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

function drawRoads(roadVao, roadBufferInfo, viewProjectionMatrix){
    // Bind the vertex array object for obstacles
    gl.bindVertexArray(roadVao);

    // Iterate over the obstacles
    for(const road of roads){
      // Create the obstacle's transformation matrix
      const cube_trans = twgl.v3.create(...road.position);
      const cube_scale = twgl.v3.create(...road.scale);

      // Calculate the obstacle's matrix
      road.matrix = twgl.m4.translate(viewProjectionMatrix, cube_trans);
      road.matrix = twgl.m4.rotateX(road.matrix, road.rotation[0]);
      road.matrix = twgl.m4.rotateY(road.matrix, road.rotation[1]);
      road.matrix = twgl.m4.rotateZ(road.matrix, road.rotation[2]);
      //building.matrix = twgl.m4.scale(obstacle.matrix, cube_scale);

      // Set the uniforms for the obstacle
      let uniforms = {
          u_matrix: road.matrix,
          u_color: [1,1,0,1]
      }

      // Set the uniforms and draw the obstacle
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, roadBufferInfo);
      
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
          u_color: [1,1,1,1]
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
    const camPos = twgl.v3.create(
        cameraPosition.x + data.width/2, 
        cameraPosition.y, 
        cameraPosition.z+data.height/2
    );
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
