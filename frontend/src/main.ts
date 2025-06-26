import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
import { createMeshInterface, createImageInterface } from './interfaces';
import { createAndStartConnection } from './signalRClient';

BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());

// Constants //

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);
const scene = createScene(engine);

// utility layer for gizmos
const utilLayer = new BABYLON.UtilityLayerRenderer(scene);

// html input to upload files
const fileInput = document.getElementById('fileInput') as HTMLInputElement;

// Dictionarys containing sphere meshes and coordinates for selections
export const selectedCoordinates: Record<string, [number, number, number][]> = {};
export const coordinateSpheres: Record<string, BABYLON.Mesh[]> = {};

// Functions //

function createScene(engine: BABYLON.Engine){
  const scene = new BABYLON.Scene(engine);

  const cam = new BABYLON.ArcRotateCamera("cam", 0, Math.PI, 20, new BABYLON.Vector3(0,0,0), scene);
  cam.attachControl(canvas, true);
  cam.wheelPrecision = 50;
  cam.lowerRadiusLimit = 10;

  const lowerLight = new BABYLON.HemisphericLight("lowerLight", new BABYLON.Vector3(0,-10,0), scene)
  lowerLight.intensity = 0.65
  const upperLight = new BABYLON.HemisphericLight("upperLight", new BABYLON.Vector3(4,10,4), scene)
  upperLight.intensity = 0.4

  return scene;
};

// Importing mesh into scene from .stl file
export function addMeshToScene(file: File, relief: boolean = false): void{
  const fileReader = new FileReader();

  fileReader.onload = (e) => {
    if (e.target && e.target.result) {
      const arrayBuffer = e.target.result as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "model/stl" });
      const url = URL.createObjectURL(blob);

      BABYLON.SceneLoader.ImportMesh(file.name, url, '', scene, (meshes) => {
        var mesh = meshes[0] as BABYLON.Mesh
        mesh.id = file.name
        mesh.name = file.name

        // creating and attaching gizmos
        const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        positionGizmo.attachedMesh = mesh
        const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        rotationGizmo.attachedMesh = mesh

        // mesh material for wireframe
        const meshMat = new BABYLON.StandardMaterial("meshMat", scene)
        mesh.material = meshMat
        
        createMeshInterface(file, mesh, positionGizmo, rotationGizmo, meshMat, relief)
        if(!relief){
          setupMeshInteraction(mesh as BABYLON.Mesh)
        }
      }, undefined, undefined, ".stl");
    }
  };

  fileReader.readAsArrayBuffer(file);
}

function setupMeshInteraction(mesh: BABYLON.Mesh){
  mesh.actionManager = new BABYLON.ActionManager(scene)
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
    const clickedPoint = scene.pick(scene.pointerX, scene.pointerY, undefined, false)
    
    // Checking if mesh has been hit
    if(clickedPoint.hit && clickedPoint.pickedPoint){
      createSelection(mesh, clickedPoint.pickedPoint)      
    }
  }))
}

function createSelection(mesh: BABYLON.Mesh, coordinatesAsVector: BABYLON.Vector3){

  const sphere = BABYLON.MeshBuilder.CreateSphere('selectedPoint', {diameter: 0.5}, scene);

  // Convert world position to local position relative to the parent mesh
  const localPosition = BABYLON.Vector3.TransformCoordinates(
    coordinatesAsVector,
    BABYLON.Matrix.Invert(mesh.getWorldMatrix())
  );
  sphere.position = localPosition

  // Glueing sphere to mesh by making it child
  sphere.parent = mesh;

  // Giving the sphere importand metadata
  sphere.metadata = {
    parentsMeshId: mesh.id,
    position: sphere.position.asArray()
  };

  // Coloring the Sphere
  const sphereMat = new BABYLON.StandardMaterial('sphereMat', scene);
  sphereMat.diffuseColor = new BABYLON.Color3(1,0.1,0.1);
  sphereMat.alpha = 1;
  sphereMat.needDepthPrePass = true;
  sphere.material = sphereMat;

  // actionmanager to react to click on sphere
  sphere.actionManager = new BABYLON.ActionManager(scene);
  sphere.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
    deselectPoint(sphere);
  }));

  // pushing sphere into global sphere dictionary
  if(!coordinateSpheres[mesh.id]){
    coordinateSpheres[mesh.id] = [];
  }
  coordinateSpheres[mesh.id].push(sphere);

  // pushing coordinates into global coordinate dictionary
  if(!selectedCoordinates[mesh.id]){
    selectedCoordinates[mesh.id] = [] as [number, number, number][];
  }
  selectedCoordinates[mesh.id].push(sphere.position.asArray())
}

function deselectPoint(sphere: BABYLON.Mesh){  
  const parentsMeshId = sphere.metadata.parentsMeshId;
  const position = sphere.metadata.position as [number, number, number];

  sphere.dispose();

  // removing sphere from dictionary
  coordinateSpheres[parentsMeshId] = coordinateSpheres[parentsMeshId].filter(s => s != sphere);

  // removing coords from dictionary
  selectedCoordinates[parentsMeshId] = selectedCoordinates[parentsMeshId].filter(coord => 
    !(coord[0] === position[0] && coord[1] === position[1] && coord[2] === position[2])    
  );
}

 // rest //

 createAndStartConnection();

engine.runRenderLoop(() => {
  scene.render();
});

fileInput.addEventListener('change', async (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    file.type.includes("image") ? createImageInterface(file) : addMeshToScene(file)
  }
});

// necessary for file drag&drop
window.addEventListener("dragover", (e) => {
  e.preventDefault()
})

// file drag&drop
window.addEventListener("drop", (e) => {
  e.preventDefault()
  const files = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) ? Array.from(e.dataTransfer.files) : []
  files.forEach((file) => addMeshToScene(file))
})

// making the engine responsive to window resizing
window.addEventListener("resize", () => {
  engine.resize()
})