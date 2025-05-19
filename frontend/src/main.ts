import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
import * as signalR from "@microsoft/signalr";
// import * as processenv from 'processenv'

BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());

// Constants //

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine);
// const utilLayer = new BABYLON.UtilityLayerRenderer(scene); // utility layer for gizmos
const fileInput = document.getElementById('fileInput') as HTMLInputElement; // input to upload files
const selectedCoordinates: Record<string, [number, number, number][]> = {};
const coordinateSpheres: Record<string, BABYLON.Mesh[]> = {};

const dotnetAdress = 'http://localhost:5500/myhub'
// const dotnetAdress = processenv.processenv('dotnetAdress','http://localhost:5500/myhub') as string
const fileServerAdress = 'http://localhost:5000'

const connection = new signalR.HubConnectionBuilder()
    .withUrl(dotnetAdress)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        return Math.min(1000 * (retryContext.previousRetryCount + 1), 10000);
      }
    })
    .build();

// Functions //

// function uploadFileToServer(file: File, xAxisValue: string, yAxisValue: string, zAxisValue: string): void{
//   const formData = new FormData();
//   formData.append('file', file);

//   fetch(`${fileServerAdress}/upload`, {
//     method: "POST",
//     body: formData
//   })
//   .then((res) => res.json())
//   .then((response) => {
//     console.log(response.filename, 'hochgeladen');   
//     connection.invoke('NotifyBackendAboutFileUpload', response.filename, xAxisValue, yAxisValue, zAxisValue)
//   })
//   .catch((err) => console.log("Fehler beim Upload:", err));
// };

function requestScraping(file: File, message: Object){
  console.log(message);
  
  const formData = new FormData();
  formData.append('file', file);

  fetch(`${fileServerAdress}/upload`, {
    method: "POST",
    body: formData
  })
  .then((res) => res.json())
  .then((response) => {
    console.log(response.filename, 'hochgeladen');
    connection.invoke('RequestScraping', message);
  })
  .catch((err) => console.log("Fehler beim Upload:", err));
}

async function downloadFileIntoScene(filename: string): Promise<File>{
  const response = await fetch(`${fileServerAdress}/download/${filename}`);
  if(!response.ok){
    throw new Error("Download Fehlgeschlagen");
  }
  const blob = await response.blob();
  const file = new File([blob], filename, {
    type: blob.type,
    lastModified: Date.now()
  });
  return file;
};

function addMeshToScene(file: File): void{
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

        // // gizmo
        // const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        // positionGizmo.attachedMesh = meshes[0]
        // const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        // rotationGizmo.attachedMesh = meshes[0]
        
        createMeshInterface(file, meshes[0] as BABYLON.Mesh, /*positionGizmo, rotationGizmo*/)
        setupMeshInteraction(meshes[0] as BABYLON.Mesh)
      }, undefined, undefined, ".stl");
    }
  };

  fileReader.readAsArrayBuffer(file);
}

function createMeshInterface(file: File, mesh: BABYLON.Mesh, /*positionGizmo: BABYLON.PositionGizmo, rotationGizmo: BABYLON.RotationGizmo*/): void {
  const objectDiv = document.createElement('div');
  objectDiv.className = 'objectDiv';
  document.getElementById('interface')?.appendChild(objectDiv);
  
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
  const supportDiameterDiv = document.createElement("div")
  supportDiameterDiv.className = "parameterDiv"
  const supportDiameterLabel = document.createElement("label")
  const supportDiameterInput = document.createElement("input")
  supportDiameterInput.type = "number"
  supportDiameterInput.id = "supportDiameterInput"
  supportDiameterLabel.textContent = "Durchmesser der Stütze in mm"
  supportDiameterDiv.appendChild(supportDiameterLabel)
  supportDiameterDiv.appendChild(supportDiameterInput)
  objectDiv.appendChild(supportDiameterDiv)
  const edgeWidthDiv = document.createElement("div")
  edgeWidthDiv.className = "parameterDiv"
  const edgeWidthLabel = document.createElement("label")
  const edgeWidthInput = document.createElement("input")
  edgeWidthInput.type = "number"
  edgeWidthInput.id = "edgeWidthInput"
  edgeWidthLabel.textContent = "Breite des Randes in mm"
  edgeWidthDiv.appendChild(edgeWidthLabel)
  edgeWidthDiv.appendChild(edgeWidthInput)
  objectDiv.appendChild(edgeWidthDiv)
  const transitionWidthDiv = document.createElement("div")
  transitionWidthDiv.className = "parameterDiv"
  const transitionWidthLabel = document.createElement("label")
  const transitionWidthInput = document.createElement("input")
  transitionWidthInput.type = "number"
  transitionWidthInput.id = "transitionWidthInput"
  transitionWidthLabel.textContent = "Gewünschte Wandstärke in mm"
  transitionWidthDiv.appendChild(transitionWidthLabel)
  transitionWidthDiv.appendChild(transitionWidthInput)
  objectDiv.appendChild(transitionWidthDiv)
  const targetWallThicknessDiv = document.createElement("div")
  targetWallThicknessDiv.className = "parameterDiv"
  const targetWallThicknessLabel = document.createElement("label")
  const targetWallThicknessInput = document.createElement("input")
  targetWallThicknessInput.type = "number"
  targetWallThicknessInput.id = "targetWallThicknessInput"
  targetWallThicknessLabel.textContent = "Gewünschte Okklusalstärke in mm"
  targetWallThicknessDiv.appendChild(targetWallThicknessLabel)
  targetWallThicknessDiv.appendChild(targetWallThicknessInput)
  objectDiv.appendChild(targetWallThicknessDiv)
  const targetTopThicknessDiv = document.createElement("div")
  targetTopThicknessDiv.className = "parameterDiv"
  const targetTopThicknessLabel = document.createElement("label")
  const targetTopThicknessInput = document.createElement("input")
  targetTopThicknessInput.type = "number"
  targetTopThicknessInput.id = "targetTopThicknessInput"
  targetTopThicknessLabel.textContent = "Breite des Übergangs in mm"
  targetTopThicknessDiv.appendChild(targetTopThicknessLabel)
  targetTopThicknessDiv.appendChild(targetTopThicknessInput)
  objectDiv.appendChild(targetTopThicknessDiv)
  const finalFilenameDiv = document.createElement("div")
  finalFilenameDiv.className = "parameterDiv"
  const finalFilenameInput = document.createElement("input")
  const finalFilenameLabel = document.createElement("label")
  finalFilenameInput.id = "finalFilenameInput"
  finalFilenameLabel.textContent = "Finaler Dateiname"
  finalFilenameDiv.appendChild(finalFilenameLabel)
  finalFilenameDiv.appendChild(finalFilenameInput)
  objectDiv.appendChild(finalFilenameDiv)

  // gizmo button
  // const gizmoButton = document.createElement('button');
  // gizmoButton.textContent = 'toggle gizmo';
  // gizmoButton.className = 'gizmoBtn';
  // gizmoButton.onclick = () => {
  //   if (rotationGizmo.attachedMesh && positionGizmo.attachedMesh){
  //     rotationGizmo.attachedMesh = null;
  //     positionGizmo.attachedMesh = null;
  //   }
  //   else {
  //     rotationGizmo.attachedMesh = mesh;
  //     positionGizmo.attachedMesh = mesh;
  //   }
  // };
  // objectDiv.appendChild(gizmoButton);
  
    // remove button
  const deleteButton = document.createElement('button');
  deleteButton.name = file.name;
  deleteButton.textContent = `${file.name} löschen`;
  deleteButton.className = 'deleteBtn';
  deleteButton.onclick = () => {
    if(coordinateSpheres[mesh.id]){
      coordinateSpheres[mesh.id].forEach(sphere => sphere.dispose());
      delete coordinateSpheres[mesh.id]
    }
    if(selectedCoordinates[mesh.id]){
      delete selectedCoordinates[mesh.id]
    }
    mesh.dispose();
    // positionGizmo.dispose();
    // rotationGizmo.dispose();
    document.getElementById('interface')?.removeChild(objectDiv);
  };
  objectDiv.appendChild(deleteButton);

  // scrape button
  const scrapeButton = document.createElement('button');
  scrapeButton.textContent = `${file.name} auskratzen`;
  scrapeButton.className = 'uploadBtn'; 
  scrapeButton.onclick = () => {requestScraping(file, {
    selections: selectedCoordinates[file.name],
    supportDiameter: supportDiameterInput.value as unknown as number,
    edgeWidth: edgeWidthInput.value as unknown as number,
    transitionWidth: transitionWidthInput.value as unknown as number,
    targetWallThickness: targetWallThicknessInput.value as unknown as number,
    targetTopThickness: targetTopThicknessInput.value as unknown as number,
    fileToUse: file.name,
    finalFilename: finalFilenameInput.value
  })};
  objectDiv.appendChild(scrapeButton);

  // // upload button
  // const uploadButton = document.createElement('button');
  // uploadButton.textContent = `${file.name} Hochladen`;
  // uploadButton.className = 'uploadBtn';
  // uploadButton.onclick = () => {uploadFileToServer(file, xAxisInput.value, yAxisInput.value, zAxisInput.value)};
  // objectDiv.appendChild(uploadButton);

  // download link
  const downloadButton = document.createElement('button');
  downloadButton.className = "downloadBtn"
  const link = document.createElement('a');
  link.textContent = `${file.name} runterladen`
  link.href = `${fileServerAdress}/download/${file.name}`;
  link.className = 'downloadLink';
  downloadButton.appendChild(link);
  objectDiv.appendChild(downloadButton);
}

function setupMeshInteraction(mesh: BABYLON.Mesh){
  mesh.actionManager = new BABYLON.ActionManager(scene)
  mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
    const clickedPoint = scene.pick(scene.pointerX, scene.pointerY, undefined, false)
    
    if(clickedPoint.hit && clickedPoint.pickedPoint){
      createSelection(mesh, clickedPoint.pickedPoint)      
    }
  }))
}

function createSelection(mesh: BABYLON.Mesh, coordinatesAsVector: BABYLON.Vector3){

  const sphere = BABYLON.MeshBuilder.CreateSphere('selectedPoint', {diameter: 1}, scene);

  // Convert world position to local position relative to the parent mesh
  const localPosition = BABYLON.Vector3.TransformCoordinates(
    coordinatesAsVector,
    BABYLON.Matrix.Invert(mesh.getWorldMatrix())
  );
  sphere.position = localPosition
  sphere.parent = mesh;

  sphere.metadata = {
    parentsMeshId: mesh.id,
    position: coordinatesAsVector.asArray()
  };

  const sphereMat = new BABYLON.StandardMaterial('sphereMat', scene);
  sphereMat.diffuseColor = new BABYLON.Color3(0,0,1);
  sphereMat.alpha = 1;
  sphereMat.needDepthPrePass = true;
  sphere.material = sphereMat;

  sphere.actionManager = new BABYLON.ActionManager(scene);
  sphere.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickDownTrigger, () => {
    deselectPoint(sphere);
  }));

  // pushing marker spheres
  if(!coordinateSpheres[mesh.id]){
    coordinateSpheres[mesh.id] = [];
  }
  coordinateSpheres[mesh.id].push(sphere);

  // // pushing marker coords
  if(!selectedCoordinates[mesh.id]){
    selectedCoordinates[mesh.id] = [] as [number, number, number][];
  }
  selectedCoordinates[mesh.id].push(sphere.position.asArray())
}

function deselectPoint(sphere: BABYLON.Mesh){
  console.log("deselecting");
  
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

engine.runRenderLoop(() => {
  scene.render();
});

connection.start().then(() => connection.invoke("register", "frontend"));

fileInput.addEventListener('change', async (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    addMeshToScene(file)
  }
});

connection.onreconnecting(() => console.log("Verbindung verloren"))

connection.onreconnected(() => {
  connection.invoke("register", "frontend")
  console.log("Verbunden")
})

connection.on("ReceiveMessage", (data) => {
  console.log(`message received: ${data}`);
});

connection.on("MeshTransformed", (filename) => {
  console.log(`Mesh bearbeitet ${filename}`)
  downloadFileIntoScene(filename)
  .then((file) => {
    addMeshToScene(file)
  })
});

const comCheckButton = document.getElementById("communicationCheckButton");
if (comCheckButton) {
  comCheckButton.onclick = () => {
    connection.invoke('SendToBackend', 'Hello Backend!');
    console.log(selectedCoordinates);
    console.log(coordinateSpheres);
  };
}