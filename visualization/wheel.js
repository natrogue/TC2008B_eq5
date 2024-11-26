/*
 * Script to draw a cube and a wheel that rotates around the pivot point
 * Tarea CG 2
 *
 * Nikole Morales
 * 2024-Nov-14
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { v3, m4 } from './libs/starter_3D_lib.js';
import vsGLSL from './assets/shaders/vs_color.glsl?raw';
import fsGLSL from './assets/shaders/fs_color.glsl?raw';

// Global variables
let programInfo = undefined;
let gl = undefined;

// Variable with the data for the object transforms, controlled by the UI
const objects = {
    pivot: {
        transforms: {
            t: { x: 0, y: 0, z: 0 }, 
            rd: { x: 0, y: 0, z: 0 }, 
            rr: { x: 0, y: 0, z: 0 }  
        },
        arrays: undefined,
        bufferInfo: undefined,
        vao: undefined,
    },
    model: {
        transforms: {
            t: { x: 0, y: 0, z: 0 }, 
            rd: { x: 0, y: 0, z: 0 }, 
            rr: { x: 0, y: 0, z: 0 },
            s: { x: 1, y: 1, z: 1 }  
        },
        arrays: undefined,
        bufferInfo: undefined,
        vao: undefined,
    }
};

function createCube() {
    const positions = [
        // Front face
        -0.3, -0.3,  0.3,
         0.3, -0.3,  0.3,
         0.3,  0.3,  0.3,
        -0.3,  0.3,  0.3,
        // Back face
        -0.3, -0.3, -0.3,
        -0.3,  0.3, -0.3,
         0.3,  0.3, -0.3,
         0.3, -0.3, -0.3,
        // Top face
        -0.3,  0.3, -0.3,
        -0.3,  0.3,  0.3,
         0.3,  0.3,  0.3,
         0.3,  0.3, -0.3,
        // Bottom face
        -0.3, -0.3, -0.3,
         0.3, -0.3, -0.3,
         0.3, -0.3,  0.3,
        -0.3, -0.3,  0.3,
        // Right face
         0.3, -0.3, -0.3,
         0.3,  0.3, -0.3,
         0.3,  0.3,  0.3,
         0.3, -0.3,  0.3,
        // Left face
        -0.3, -0.3, -0.3,
        -0.3, -0.3,  0.3,
        -0.3,  0.3,  0.3,
        -0.3,  0.3, -0.3,
    ];

    const indices = [
         0,  1,  2,      0,  2,  3,    // front
         4,  5,  6,      4,  6,  7,    // back
         8,  9, 10,      8, 10, 11,    // top
        12, 13, 14,     12, 14, 15,    // bottom
        16, 17, 18,     16, 18, 19,    // right
        20, 21, 22,     20, 22, 23,    // left
    ];

    
        const colors = [
            // Front face
            1, 0, 0, 1,   // Red
            1, 0, 0, 1,   
            1, 0, 0, 1,   
            1, 0, 0, 1,   
            // Back face
            0, 1, 0, 1,   // Green
            0, 1, 0, 1,   
            0, 1, 0, 1,   
            0, 1, 0, 1,   
            // Top face
            0, 0, 1, 1,   // Blue
            0, 0, 1, 1,   
            0, 0, 1, 1,   
            0, 0, 1, 1,   
            // Bottom face
            1, 1, 0, 1,   // Yellow
            1, 1, 0, 1,   
            1, 1, 0, 1,   
            1, 1, 0, 1,   
            // Right face
            1, 0, 1, 1,   // Magenta
            1, 0, 1, 1,   
            1, 0, 1, 1,   
            1, 0, 1, 1,   
            // Left face
            0, 1, 1, 1,   // Cyan
            0, 1, 1, 1,   
            0, 1, 1, 1,   
            0, 1, 1, 1,   
        ];
    

    return {
        a_position: { numComponents: 3, data: positions },
        a_color: { numComponents: 4, data: colors },
        indices: { numComponents: 3, data: indices },
    };
}

function loadObj(objData) {
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

async function main() {
    const canvas = document.querySelector('canvas');
    gl = canvas.getContext('webgl2');
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    setupUI();

    programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

    const response = await fetch('./wheel_with_normals.obj');
    const objData = await response.text();

    objects.model.arrays = loadObj(objData);
    objects.model.bufferInfo = twgl.createBufferInfoFromArrays(gl, objects.model.arrays);
    objects.model.vao = twgl.createVAOFromBufferInfo(gl, programInfo, objects.model.bufferInfo);

    // Define the pivot point as a small cube
    const pivotData = createCube();
    objects.pivot.bufferInfo = twgl.createBufferInfoFromArrays(gl, pivotData);
    objects.pivot.vao = twgl.createVAOFromBufferInfo(gl, programInfo, objects.pivot.bufferInfo);

    drawScene();
}

function drawScene() {
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(programInfo.program);

    const viewProjectionMatrix = setupViewProjection(gl);

    // Apply pivot transformations
    const pivotTranslation = [objects.pivot.transforms.t.x, objects.pivot.transforms.t.y, objects.pivot.transforms.t.z];
    const pivotRotation = [objects.pivot.transforms.rr.x, objects.pivot.transforms.rr.y, objects.pivot.transforms.rr.z];

    const pivotTranslationMatrix = m4.translation(pivotTranslation);
    const pivotRotationMatrixX = m4.rotationX(pivotRotation[0]);
    const pivotRotationMatrixY = m4.rotationY(pivotRotation[1]);
    const pivotRotationMatrixZ = m4.rotationZ(pivotRotation[2]);

    let pivotTransforms = m4.identity();
    pivotTransforms = m4.multiply(pivotTranslationMatrix, pivotTransforms);
    pivotTransforms = m4.multiply(pivotRotationMatrixX, pivotTransforms);
    pivotTransforms = m4.multiply(pivotRotationMatrixY, pivotTransforms);
    pivotTransforms = m4.multiply(pivotRotationMatrixZ, pivotTransforms);

    // Draw the pivot point
    twgl.setUniforms(programInfo, { u_transforms: m4.multiply(viewProjectionMatrix, pivotTransforms) });
    gl.bindVertexArray(objects.pivot.vao);
    twgl.drawBufferInfo(gl, objects.pivot.bufferInfo, gl.TRIANGLES);

    // Apply model transformations relative to the pivot
    const modelTranslation = [objects.model.transforms.t.x, objects.model.transforms.t.y, objects.model.transforms.t.z];
    const modelScale = [objects.model.transforms.s.x, objects.model.transforms.s.y, objects.model.transforms.s.z];
    const modelRotation = [objects.model.transforms.rr.x, objects.model.transforms.rr.y, objects.model.transforms.rr.z];

    const modelTranslationMatrix = m4.translation(modelTranslation);
    const modelScaleMatrix = m4.scale(modelScale);
    const modelRotationMatrixX = m4.rotationX(modelRotation[0]);
    const modelRotationMatrixY = m4.rotationY(modelRotation[1]);
    const modelRotationMatrixZ = m4.rotationZ(modelRotation[2]);

    let transforms = m4.identity();
    transforms = m4.multiply(pivotTransforms, transforms);  // Apply pivot transformations first
    transforms = m4.multiply(modelTranslationMatrix, transforms);
    transforms = m4.multiply(modelRotationMatrixX, transforms);
    transforms = m4.multiply(modelRotationMatrixY, transforms);
    transforms = m4.multiply(modelRotationMatrixZ, transforms);
    transforms = m4.multiply(modelScaleMatrix, transforms);
    transforms = m4.multiply(viewProjectionMatrix, transforms);

    twgl.setUniforms(programInfo, { u_transforms: transforms });
    gl.bindVertexArray(objects.model.vao);
    twgl.drawBufferInfo(gl, objects.model.bufferInfo);

    requestAnimationFrame(drawScene);
}

function setupViewProjection(gl) {
    const fov = 60 * Math.PI / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fov, aspect, 1, 200);

    const cameraPosition = [0, 0, 10];
    const target = [0, 0, 0];
    const up = [0, 1, 0];

    const cameraMatrix = m4.lookAt(cameraPosition, target, up);
    const viewMatrix = m4.inverse(cameraMatrix);
    return m4.multiply(projectionMatrix, viewMatrix);
}

function setupUI() {
    const gui = new GUI();

    const pivotFolder = gui.addFolder('Pivot:');
    pivotFolder.add(objects.pivot.transforms.t, 'x', -5, 5);
    pivotFolder.add(objects.pivot.transforms.t, 'y', -5, 5);
    pivotFolder.add(objects.pivot.transforms.t, 'z', -5, 5);
    pivotFolder.add(objects.pivot.transforms.rd, 'x', 0, 360)
        .onChange(value => {
            objects.pivot.transforms.rd.x = value;
            objects.pivot.transforms.rr.x = value * Math.PI / 180;
        });
    pivotFolder.add(objects.pivot.transforms.rd, 'y', 0, 360)
        .onChange(value => {
            objects.pivot.transforms.rd.y = value;
            objects.pivot.transforms.rr.y = value * Math.PI / 180;
        });
    pivotFolder.add(objects.pivot.transforms.rd, 'z', 0, 360)
        .onChange(value => {
            objects.pivot.transforms.rd.z = value;
            objects.pivot.transforms.rr.z = value * Math.PI / 180;
        });

    const modelFolder = gui.addFolder('Model:');

    const traFolder = modelFolder.addFolder('Translation:');
    traFolder.add(objects.model.transforms.t, 'x', -5, 5);
    traFolder.add(objects.model.transforms.t, 'y', -5, 5);
    traFolder.add(objects.model.transforms.t, 'z', -5, 5);

    const rotFolder = modelFolder.addFolder('Rotation:');
    rotFolder.add(objects.model.transforms.rd, 'x', 0, 360)
        .onChange(value => {
            objects.model.transforms.rd.x = value;
            objects.model.transforms.rr.x = value * Math.PI / 180;
        });
    rotFolder.add(objects.model.transforms.rd, 'y', 0, 360)
        .onChange(value => {
            objects.model.transforms.rd.y = value;
            objects.model.transforms.rr.y = value * Math.PI / 180;
        });
    rotFolder.add(objects.model.transforms.rd, 'z', 0, 360)
        .onChange(value => {
            objects.model.transforms.rd.z = value;
            objects.model.transforms.rr.z = value * Math.PI / 180;
        });

    const scaFolder = modelFolder.addFolder('Scale:');
    scaFolder.add(objects.model.transforms.s, 'x', 0.3, 5);
    scaFolder.add(objects.model.transforms.s, 'y', 0.3, 5);
    scaFolder.add(objects.model.transforms.s, 'z', 0.3, 5);

    modelFolder.open();
}

main();
