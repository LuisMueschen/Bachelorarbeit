import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
// import * as processenv from 'processenv'
import { fileServerAdress, requestScraping } from './signalRClient';

BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());

// Constants //

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine);

// utility layer for gizmos
const utilLayer = new BABYLON.UtilityLayerRenderer(scene);

// html input to upload files
const fileInput = document.getElementById('fileInput') as HTMLInputElement;

// Dictionarys containing sphere meshes and coordinates for selections
export const selectedCoordinates: Record<string, [number, number, number][]> = {};
export const coordinateSpheres: Record<string, BABYLON.Mesh[]> = {};

// Functions //

// Importing mesh into scene from .stl file
export function addMeshToScene(file: File): void{
  const fileReader = new FileReader();

  fileReader.onload = (e) => {
    if (e.target && e.target.result) {
      const arrayBuffer = e.target.result as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "model/stl" });
      const url = URL.createObjectURL(blob);

      BABYLON.SceneLoader.ImportMesh(file.name, url, '', scene, (meshes) => {
        // scaling
        meshes[0].scaling.scaleInPlace(0.1);
        meshes[0].position.y = -1;
        meshes[0].id = file.name
        meshes[0].name = file.name

        // creating and attaching gizmos
        const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        positionGizmo.attachedMesh = meshes[0]
        const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        rotationGizmo.attachedMesh = meshes[0]
        
        createMeshInterface(file, meshes[0] as BABYLON.Mesh, positionGizmo, rotationGizmo)
        setupMeshInteraction(meshes[0] as BABYLON.Mesh)
      }, undefined, undefined, ".stl");
    }
  };

  fileReader.readAsArrayBuffer(file);
}

// creating the html interface to input parameters and interact with mesh
function createMeshInterface(file: File, mesh: BABYLON.Mesh, positionGizmo: BABYLON.PositionGizmo, rotationGizmo: BABYLON.RotationGizmo): void {

  // parrent div containing the following objects
  const objectDiv = document.createElement('div');
  objectDiv.className = 'objectDiv';
  document.getElementById('interface')?.appendChild(objectDiv);

  const filenameLabel = document.createElement("label");
  filenameLabel.textContent = file.name;
  filenameLabel.className = "filenameLabel"
  objectDiv.appendChild(filenameLabel)

  // parameter inputs
  // const xAxisDiv = document.createElement("div")
  // xAxisDiv.className = "parameterDiv"
  // const xAxisInput = document.createElement("input")
  // const xAxisLabel = document.createElement("label")
  // xAxisInput.type = "number"
  // xAxisInput.id = "xAxisInput"
  // xAxisLabel.textContent = "X-Achse"
  // xAxisDiv.appendChild(xAxisLabel)
  // xAxisDiv.appendChild(xAxisInput)
  // objectDiv.appendChild(xAxisDiv)
  // const yAxisDiv = document.createElement("div")
  // yAxisDiv.className = "parameterDiv"
  // const yAxisInput = document.createElement("input")
  // const yAxisLabel = document.createElement("label")
  // yAxisInput.type = "number"
  // yAxisInput.id = "yAxisInput"
  // yAxisLabel.textContent = "Y-Achse"
  // yAxisDiv.appendChild(yAxisLabel)
  // yAxisDiv.appendChild(yAxisInput)
  // objectDiv.appendChild(yAxisDiv)
  // const zAxisDiv = document.createElement("div")
  // zAxisDiv.className = "parameterDiv"
  // const zAxisInput = document.createElement("input")
  // const zAxisLabel = document.createElement("label")
  // zAxisInput.type = "number"
  // zAxisInput.id = "zAxisInput"
  // zAxisLabel.textContent = "Z-Achse"
  // zAxisDiv.appendChild(zAxisLabel)
  // zAxisDiv.appendChild(zAxisInput)
  // objectDiv.appendChild(zAxisDiv)

  const supportDiameterLabel = document.createElement("label")
  const supportDiameterInput = document.createElement("input")
  supportDiameterInput.type = "number"
  supportDiameterInput.value = "1.5"
  supportDiameterInput.id = "supportDiameterInput"
  supportDiameterLabel.textContent = "Durchmesser der Stütze in mm"
  objectDiv.appendChild(supportDiameterLabel)
  objectDiv.appendChild(supportDiameterInput)

  const edgeWidthLabel = document.createElement("label")
  const edgeWidthInput = document.createElement("input")
  edgeWidthInput.type = "number"
  edgeWidthInput.value = "2"
  edgeWidthInput.id = "edgeWidthInput"
  edgeWidthLabel.textContent = "Breite des Randes in mm"
  objectDiv.appendChild(edgeWidthLabel)
  objectDiv.appendChild(edgeWidthInput)

  const transitionWidthLabel = document.createElement("label")
  const transitionWidthInput = document.createElement("input")
  transitionWidthInput.type = "number"
  transitionWidthInput.value = "1"
  transitionWidthInput.id = "transitionWidthInput"
  transitionWidthLabel.textContent = "Gewünschte Wandstärke in mm"
  objectDiv.appendChild(transitionWidthLabel)
  objectDiv.appendChild(transitionWidthInput)

  const targetWallThicknessLabel = document.createElement("label")
  const targetWallThicknessInput = document.createElement("input")
  targetWallThicknessInput.type = "number"
  targetWallThicknessInput.value = "0.3"
  targetWallThicknessInput.id = "targetWallThicknessInput"
  targetWallThicknessLabel.textContent = "Gewünschte Okklusalstärke in mm"
  objectDiv.appendChild(targetWallThicknessLabel)
  objectDiv.appendChild(targetWallThicknessInput)
  
  const targetTopThicknessLabel = document.createElement("label")
  const targetTopThicknessInput = document.createElement("input")
  targetTopThicknessInput.type = "number"
  targetTopThicknessInput.value = "0.5"
  targetTopThicknessInput.id = "targetTopThicknessInput"
  targetTopThicknessLabel.textContent = "Breite des Übergangs in mm"
  objectDiv.appendChild(targetTopThicknessLabel)
  objectDiv.appendChild(targetTopThicknessInput)

  const finalFilenameInput = document.createElement("input")
  const finalFilenameLabel = document.createElement("label")
  finalFilenameInput.id = "finalFilenameInput"
  finalFilenameInput.value = file.name
  finalFilenameLabel.textContent = "Finaler Dateiname"
  objectDiv.appendChild(finalFilenameLabel)
  objectDiv.appendChild(finalFilenameInput)

  const buttonDiv = document.createElement("div")
  buttonDiv.className = "buttonDiv"
  objectDiv.appendChild(buttonDiv)

  // gizmo button
  const gizmoButton = document.createElement('button');
  gizmoButton.textContent = 'gizmo';
  gizmoButton.className = 'gizmoBtn';
  gizmoButton.onclick = () => {
    if (rotationGizmo.attachedMesh && positionGizmo.attachedMesh){
      rotationGizmo.attachedMesh = null;
      positionGizmo.attachedMesh = null;
    }
    else {
      rotationGizmo.attachedMesh = mesh;
      positionGizmo.attachedMesh = mesh;
    }
  };
  buttonDiv.appendChild(gizmoButton);
  
  // button to delete mesh and interface from scene
  const deleteButton = document.createElement('button');
  deleteButton.name = file.name;
  deleteButton.textContent = `löschen`;
  deleteButton.className = 'deleteBtn';
  deleteButton.onclick = () => {

    // Checking for existing selections on mesh
    if(coordinateSpheres[mesh.id]){
      coordinateSpheres[mesh.id].forEach(sphere => sphere.dispose());
      delete coordinateSpheres[mesh.id]
    }
    if(selectedCoordinates[mesh.id]){
      delete selectedCoordinates[mesh.id]
    }

    mesh.dispose();
    positionGizmo.dispose();
    rotationGizmo.dispose();
    document.getElementById('interface')?.removeChild(objectDiv);
  };
  buttonDiv.appendChild(deleteButton);

  // button to start scraping
  const scrapeButton = document.createElement('button');
  scrapeButton.textContent = `auskratzen`;
  scrapeButton.className = 'uploadBtn'; 
  scrapeButton.onclick = () => {requestScraping(file, {
    // necessary parameters for scraping
    selections: selectedCoordinates[file.name],
    supportDiameter: supportDiameterInput.value as unknown as number,
    edgeWidth: edgeWidthInput.value as unknown as number,
    transitionWidth: transitionWidthInput.value as unknown as number,
    targetWallThickness: targetWallThicknessInput.value as unknown as number,
    targetTopThickness: targetTopThicknessInput.value as unknown as number,
    fileToUse: file.name,
    finalFilename: finalFilenameInput.value
  })};
  buttonDiv.appendChild(scrapeButton);

  // upload button
  // const uploadButton = document.createElement('button');
  // uploadButton.textContent = `${file.name} Hochladen`;
  // uploadButton.className = 'uploadBtn';
  // uploadButton.onclick = () => {uploadFileToServer(file, xAxisInput.value, yAxisInput.value, zAxisInput.value)};
  // objectDiv.appendChild(uploadButton);

  // link to download file from backend endpoint
  const downloadButton = document.createElement('button');
  downloadButton.className = "downloadBtn"
  const link = document.createElement('a');
  link.textContent = `runterladen`
  link.href = `${fileServerAdress}/download/${file.name}`;
  link.className = 'downloadLink';
  downloadButton.appendChild(link);
  buttonDiv.appendChild(downloadButton);
}

function setupMeshInteraction(mesh: BABYLON.Mesh){
  mesh.actionManager = new BABYLON.ActionManager(scene)
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
    const clickedPoint = scene.pick(scene.pointerX, scene.pointerY, undefined, false)
    
    // Checking if mesh has been clicked
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

scene.createDefaultCameraOrLight(true, false, true);
const cam = scene.activeCamera as BABYLON.ArcRotateCamera;
if(cam){
  cam.radius *= 4;
}

engine.runRenderLoop(() => {
  scene.render();
});

fileInput.addEventListener('change', async (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (target.files && target.files.length > 0) {
    const file = target.files[0]; 
    addMeshToScene(file)
  }
});

// making the engine responsive to window resizing
window.addEventListener("resize", () => {
  engine.resize()
})