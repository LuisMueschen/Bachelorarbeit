import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
import * as signalR from "@microsoft/signalr";

BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());

// Constants //

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine);
const utilLayer = new BABYLON.UtilityLayerRenderer(scene); // utility layer for gizmos
const fileInput = document.getElementById('fileInput') as HTMLInputElement; // input to upload files
const selectedCoordinates: Record<string, [number, number, number][]> = {};
const coordinateSpheres: Record<string, BABYLON.Mesh[]> = {};

const signalRAdress = 'http://localhost:5500/myhub'
const fileServerAdress = 'http://localhost:5000'

const connection = new signalR.HubConnectionBuilder()
    .withUrl(signalRAdress)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        return Math.min(1000 * (retryContext.previousRetryCount + 1), 10000);
      }
    })
    .build();

// Functions //

function uploadFileToServer(file: File): void{
  const formData = new FormData();
  formData.append('file', file);

  fetch(`${fileServerAdress}/upload`, {
    method: "POST",
    body: formData
  })
  .then((res) => res.json())
  .then((response) => {
    console.log(response.filename, 'hochgeladen');   
    connection.invoke('NotifyBackendAboutFileUpload', response.filename)
  })
  .catch((err) => console.log("Fehler beim Upload:", err));
};

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

        // material
        const meshMat = new BABYLON.StandardMaterial('meshMat', scene);
        meshMat.diffuseColor = new BABYLON.Color3(0.8,0.8,0.8);
        meshMat.alpha = 1;
        meshMat.needDepthPrePass = true;
        meshes[0].material = meshMat;

        // gizmo
        const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        positionGizmo.attachedMesh = meshes[0]
        const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        rotationGizmo.attachedMesh = meshes[0]
        
        // div for each object
        const objectDiv = document.createElement('div');
        objectDiv.id = 'objectDiv';
        document.getElementById('interface')?.appendChild(objectDiv);
        
        // gizmo button
        const gizmoButton = document.createElement('button');
        gizmoButton.textContent = 'toggle gizmo';
        gizmoButton.className = 'gizmoBtn';
        gizmoButton.onclick = () => {
          if (rotationGizmo.attachedMesh && positionGizmo.attachedMesh){
            rotationGizmo.attachedMesh = null;
            positionGizmo.attachedMesh = null;
          }
          else {
            rotationGizmo.attachedMesh = meshes[0];
            positionGizmo.attachedMesh = meshes[0];
          }
        };
        objectDiv.appendChild(gizmoButton);
        
         // remove button
        const deleteButton = document.createElement('button');
        deleteButton.name = file.name;
        deleteButton.textContent = `${file.name} löschen`;
        deleteButton.className = 'deleteBtn';
        deleteButton.onclick = () => {
          if(coordinateSpheres[meshes[0].id]){
            coordinateSpheres[meshes[0].id].forEach(sphere => sphere.dispose());
            delete coordinateSpheres[meshes[0].id]
          }
          if(selectedCoordinates[meshes[0].id]){
            delete selectedCoordinates[meshes[0].id]
          }
          meshes[0].dispose();
          positionGizmo.dispose();
          rotationGizmo.dispose();
          document.getElementById('interface')?.removeChild(objectDiv);
        };
        objectDiv.appendChild(deleteButton);

        // upload button
        const uploadButton = document.createElement('button');
        uploadButton.textContent = `${file.name} Hochladen`;
        uploadButton.className = 'uploadBtn';
        uploadButton.onclick = () => {uploadFileToServer(file)};
        objectDiv.appendChild(uploadButton);

        // download link
        const downloadButton = document.createElement('button');
        const link = document.createElement('a');
        link.textContent = `${file.name} runterladen`
        link.href = `${fileServerAdress}/download/${file.name}`;
        link.className = 'downloadLink';
        downloadButton.appendChild(link);
        objectDiv.appendChild(downloadButton);
      }, undefined, undefined, ".stl");
    }
  };

  fileReader.readAsArrayBuffer(file);
}

function createSelection(mesh: BABYLON.Mesh, coordinatesAsVector: BABYLON.Vector3){
  const sphere = BABYLON.MeshBuilder.CreateSphere('selectedPoint', {diameter: 10}, scene);
  sphere.position = coordinatesAsVector.clone();
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
  selectedCoordinates[mesh.id].push(sphere.metadata.position)
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

canvas.addEventListener("pointerdown", (event) => {
  const selectedPoint = scene.pick(event.clientX - window.screen.width*0.2, event.clientY, undefined, false);
  console.log(selectedPoint.pickedMesh?.name);
  
  if(selectedPoint.pickedMesh?.name === 'selectedPoint'){
    deselectPoint(selectedPoint.pickedMesh as BABYLON.Mesh)
    return
  }

  if(selectedPoint.hit && selectedPoint.pickedPoint){
    const mesh = selectedPoint.pickedMesh as BABYLON.Mesh;
    const coordinates = selectedPoint.pickedPoint as BABYLON.Vector3;
    createSelection(mesh, coordinates);
  }
})

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