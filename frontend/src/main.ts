import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
// import * as processenv from 'processenv'
import { serverAdress, requestScraping, uploadImage } from './signalRClient';

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
export function addMeshToScene(file: File): void{
  const fileReader = new FileReader();

  fileReader.onload = (e) => {
    if (e.target && e.target.result) {
      const arrayBuffer = e.target.result as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "model/stl" });
      const url = URL.createObjectURL(blob);

      BABYLON.SceneLoader.ImportMesh(file.name, url, '', scene, (meshes) => {
        meshes[0].id = file.name
        meshes[0].name = file.name

        // creating and attaching gizmos
        const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        positionGizmo.attachedMesh = meshes[0]
        const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        rotationGizmo.attachedMesh = meshes[0]

        // mesh material for wireframe
        const meshMat = new BABYLON.StandardMaterial("meshMat", scene)
        meshes[0].material = meshMat
        
        createMeshInterface(file, meshes[0] as BABYLON.Mesh, positionGizmo, rotationGizmo, meshMat)
        setupMeshInteraction(meshes[0] as BABYLON.Mesh)
      }, undefined, undefined, ".stl");
    }
  };

  fileReader.readAsArrayBuffer(file);
}

// creating the html interface to input parameters and interact with mesh
function createMeshInterface(
  file: File, mesh: BABYLON.Mesh, 
  positionGizmo: BABYLON.PositionGizmo, 
  rotationGizmo: BABYLON.RotationGizmo,
  meshMat: BABYLON.StandardMaterial
): void {

  // parrent div containing the following objects
  const objectDiv = document.createElement('div');
  objectDiv.className = 'objectDiv';
  document.getElementById('interface')?.appendChild(objectDiv);

  const filenameLabel = document.createElement("label");
  filenameLabel.textContent = file.name;
  filenameLabel.className = "filenameLabel"
  objectDiv.appendChild(filenameLabel)

  // parameter inputs
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
  transitionWidthLabel.textContent = "Breite des Übergangs in mm"
  objectDiv.appendChild(transitionWidthLabel)
  objectDiv.appendChild(transitionWidthInput)

  const targetWallThicknessLabel = document.createElement("label")
  const targetWallThicknessInput = document.createElement("input")
  targetWallThicknessInput.type = "number"
  targetWallThicknessInput.value = "0.3"
  targetWallThicknessInput.id = "targetWallThicknessInput"
  targetWallThicknessLabel.textContent = "Gewünschte Wandstärke in mm"
  objectDiv.appendChild(targetWallThicknessLabel)
  objectDiv.appendChild(targetWallThicknessInput)
  
  const targetTopThicknessLabel = document.createElement("label")
  const targetTopThicknessInput = document.createElement("input")
  targetTopThicknessInput.type = "number"
  targetTopThicknessInput.value = "0.5"
  targetTopThicknessInput.id = "targetTopThicknessInput"
  targetTopThicknessLabel.textContent = "Gewünschte Okklusalstärke in mm"
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
  scrapeButton.onclick = () => {
    if(finalFilenameInput.value !== file.name){
      requestScraping(file, {
      // necessary parameters for scraping
      selections: selectedCoordinates[file.name],
      supportDiameter: supportDiameterInput.value as unknown as number,
      edgeWidth: edgeWidthInput.value as unknown as number,
      transitionWidth: transitionWidthInput.value as unknown as number,
      targetWallThickness: targetWallThicknessInput.value as unknown as number,
      targetTopThickness: targetTopThicknessInput.value as unknown as number,
      fileToUse: file.name,
      finalFilename: finalFilenameInput.value
      });
    }else{
      alert("Bitte benenne die Neue Datei anders als die Alte")
    };
  };
  buttonDiv.appendChild(scrapeButton);

  // link to download file from backend endpoint
  const downloadButton = document.createElement('button');
  downloadButton.className = "downloadBtn"
  const link = document.createElement('a');
  link.textContent = `runterladen`
  link.href = `${serverAdress}/download/${file.name}`;
  link.className = 'downloadLink';
  downloadButton.appendChild(link);
  buttonDiv.appendChild(downloadButton);

  const wireframeButton = document.createElement("button");
  wireframeButton.className = "wireframeBtn";
  wireframeButton.textContent = "wireframe"
  wireframeButton.onclick = () => {
    meshMat.wireframe = !meshMat.wireframe;
  };
  buttonDiv.appendChild(wireframeButton);
}

function createImageInterface(file: File){
  // Creating Div to contain this interface part
  const objectDiv = document.createElement("div")
  objectDiv.className = 'objectDiv'

  // Label displaying Filename for this interface
  const filenameLabel = document.createElement("label");
  filenameLabel.textContent = file.name;
  filenameLabel.className = "filenameLabel"
  objectDiv.appendChild(filenameLabel)

  // Input elements for parameters for Relief creation
  const scaleXLabel = document.createElement("label");
  const scaleXInput = document.createElement("input");
  scaleXInput.type = "number";
  scaleXInput.value = "1.0"
  scaleXInput.step = "0.1"
  scaleXLabel.textContent = "X-Skalierung"
  objectDiv.appendChild(scaleXLabel)
  objectDiv.appendChild(scaleXInput)

  const scaleYLabel = document.createElement("label");
  const scaleYInput = document.createElement("input");
  scaleYInput.type = "number";
  scaleYInput.value = "1.0"
  scaleYInput.step = "0.1"
  scaleYLabel.textContent = "Y-Skalierung"
  objectDiv.appendChild(scaleYLabel)
  objectDiv.appendChild(scaleYInput)

  const scaleZLabel = document.createElement("label");
  const scaleZInput = document.createElement("input");
  scaleZInput.type = "number";
  scaleZInput.value = "1.0"
  scaleZInput.step = "0.1"
  scaleZLabel.textContent = "Z-Skalierung"
  objectDiv.appendChild(scaleZLabel)
  objectDiv.appendChild(scaleZInput)

  const invertLabel = document.createElement("label");
  const invertInput = document.createElement("input");
  invertInput.type = "checkbox"
  invertLabel.textContent = "Invertieren"
  objectDiv.appendChild(invertLabel)
  objectDiv.appendChild(invertInput)

  // Button to start creation of Relief
  const uploadButton = document.createElement("button")
  uploadButton.onclick = () => {    
    uploadImage(file, {
      filename: file.name,
      scaleX: scaleXInput.value as unknown as number,      
      scaleY: scaleYInput.value as unknown as number,      
      scaleZ: scaleZInput.value as unknown as number,
      invert: invertInput.checked as unknown as boolean
    })
  }
  uploadButton.textContent = "hochladen"
  objectDiv.appendChild(uploadButton)

  // Button to remove this image interface
  const deleteButton = document.createElement('button');
  deleteButton.name = file.name;
  deleteButton.textContent = `löschen`;
  deleteButton.className = 'deleteBtn';
  deleteButton.onclick = () => {
    document.getElementById('interface')?.removeChild(objectDiv);
  }
  objectDiv.appendChild(deleteButton)

  document.getElementById('interface')?.appendChild(objectDiv)
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