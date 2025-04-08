import * as BABYLON from 'babylonjs';
import { STLFileLoader } from 'babylonjs-loaders';
import { io } from "socket.io-client";

BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());

// Functions //

function createScene() {
  const scene = new BABYLON.Scene(engine);

  scene.createDefaultCameraOrLight(true, false, true);

  return scene;
};

function checkConnection() {
  socket.emit("check_connection", { message: "hello backend" });
}

function uploadFile(file: File){
  const reader = new FileReader();
  reader.onload = () => {
    if(reader.result){
      const base64String = (reader.result as string).split(",")[1];
      socket.emit("transform_mesh", {data: base64String});
    };
  };
  reader.readAsDataURL(file);
};

function base64ToSTL(base64: string): File {
  // Ensure the base64 string is properly formatted
  // const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const blob = new Blob([ab], { type: 'model/stl' });
  return new File([blob], '', { type: 'model/stl' });
}

function addMeshToScene(file: File){
  const fileReader = new FileReader();

  fileReader.onload = (e) => {
    if (e.target && e.target.result) {
      const arrayBuffer = e.target.result as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "model/stl" });
      const url = URL.createObjectURL(blob);

      BABYLON.SceneLoader.ImportMesh(file.name, url, '', scene, (meshes) => {
        console.log('geladen');

        // scaling
        meshes[0].scaling.scaleInPlace(0.1);
        meshes[0].position.y = -1;

        // gizmo
        const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
        positionGizmo.attachedMesh = meshes[0]
        const rotationGizmo = new BABYLON.RotationGizmo(utilLayer);
        rotationGizmo.attachedMesh = meshes[0]

        // div for each object
        const objectDiv = document.createElement('div');
        objectDiv.id = 'objectDiv';
        document.getElementById('interface')?.appendChild(objectDiv);

        // remove button
        const deleteButton = document.createElement('button');
        deleteButton.name = file.name;
        deleteButton.textContent = `${file.name} löschen`;
        deleteButton.onclick = () => {
          meshes[0].dispose();
          positionGizmo.dispose();
          rotationGizmo.dispose();
          document.getElementById('interface')?.removeChild(objectDiv);
        };
        document.getElementById('objectDiv')?.appendChild(deleteButton);

        // upload button
        const uploadButton = document.createElement('button');
        uploadButton.textContent = 'Hochladen';
        uploadButton.onclick = () => {uploadFile(file)};
        document.getElementById("objectDiv")?.appendChild(uploadButton);
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
const socket = io("http://localhost:5000");
const comCheckButton = document.getElementById("communicationCheckButton");

 // rest //

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

socket.on("connect", () => {
  console.log("Socket.IO connection established");
});

socket.on("disconnect", () => {
  console.log("Socket.IO connection closed");
});

socket.on("successfull_communication", (data) => {
  console.log(`message received: ${data.message}`);
});

socket.on("transformed_mesh", (data) => {
  const file = base64ToSTL(data.mesh)
  console.log(`File received ${file}`);
  addMeshToScene(file)
});

if (comCheckButton) {
  comCheckButton.onclick = () => { checkConnection(); };
}