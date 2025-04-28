import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
import * as signalR from "@microsoft/signalr";

BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());

// Functions //

function createScene(): BABYLON.Scene {
  const scene = new BABYLON.Scene(engine);

  scene.createDefaultCameraOrLight(true, false, true);

  return scene;
};

function checkConnection(): void {
  // socket.emit("check_connection", { message: "hello backend" });
  connection.invoke('SendToBackend', 'Hello Backend!')
}

function uploadFile(file: File): void{
  const formData = new FormData();
  formData.append('file', file);

  fetch("http://localhost:5000/upload", {
    method: "POST",
    body: formData
  })
  .then(() => {
    console.log(file.name, 'hochgeladen');
    connection.invoke('NotifyBackendAboutFileUpload', file.name)
  })
  .catch((err) => console.log("Fehler beim Upload:", err));
};

async function downloadFile(filename: string): Promise<File>{
  const response = await fetch(`http://localhost:5000/download/${filename}`);
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

        // gizmo
        const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        positionGizmo.attachedMesh = meshes[0]
        // const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        // rotationGizmo.attachedMesh = meshes[0]
        
        // div for each object
        const objectDiv = document.createElement('div');
        objectDiv.id = 'objectDiv';
        document.getElementById('interface')?.appendChild(objectDiv);
        
        // gizmo button
        const gizmoButton = document.createElement('button');
        gizmoButton.textContent = 'toggle gizmo';
        gizmoButton.className = 'gizmoBtn';
        gizmoButton.onclick = () => {
          if (/*rotationGizmo.attachedMesh &&*/ positionGizmo.attachedMesh){
            // rotationGizmo.attachedMesh = null;
            positionGizmo.attachedMesh = null;
          }
          else {
            // rotationGizmo.attachedMesh = meshes[0];
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
          meshes[0].dispose();
          positionGizmo.dispose();
          // rotationGizmo.dispose();
          document.getElementById('interface')?.removeChild(objectDiv);
        };
        objectDiv.appendChild(deleteButton);

        // upload button
        const uploadButton = document.createElement('button');
        uploadButton.textContent = `${file.name} Hochladen`;
        uploadButton.className = 'uploadBtn';
        uploadButton.onclick = () => {uploadFile(file)};
        objectDiv.appendChild(uploadButton);
      }, undefined, undefined, ".stl");
    }
  };

  fileReader.readAsArrayBuffer(file);
}

// Constants //

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);
const scene = createScene();
const utilLayer = new BABYLON.UtilityLayerRenderer(scene); // utility layer for gizmos
const fileInput = document.getElementById('fileInput') as HTMLInputElement; // input to upload files
const selectedCoordinates: Object[] = [];

const connection = new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5500/myhub")
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        return Math.min(1000 * (retryContext.previousRetryCount + 1), 10000);
      }
    })
    .build();

 // rest //

engine.runRenderLoop(() => {
  scene.render();
});

await connection.start();
connection.invoke("register", "frontend")

fileInput.addEventListener('change', async (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (target.files && target.files.length > 0) {
    const file = target.files[0];
    addMeshToScene(file)
  }
});

canvas.addEventListener("pointerdown", (event) => {
  const xCoord = event.clientX - window.screen.width*0.2;
  const coordinates = scene.pick(xCoord, event.clientY);

  if(coordinates.hit && coordinates.pickedPoint){
    selectedCoordinates.push({meshID: coordinates.pickedMesh?.id, point: coordinates.pickedPoint.asArray()});
    const sphere = BABYLON.MeshBuilder.CreateSphere('selectedPoint', {diameter: 0.1} , scene);
    sphere.position = coordinates.pickedPoint.clone();
    console.log(selectedCoordinates);    
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
  downloadFile(filename)
  .then((file) => {
    addMeshToScene(file)
  })
});

const comCheckButton = document.getElementById("communicationCheckButton");
if (comCheckButton) {
  comCheckButton.onclick = () => { checkConnection(); };
}