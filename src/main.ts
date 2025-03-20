import * as BABYLON from 'babylonjs';
import {STLFileLoader} from 'babylonjs-loaders';
BABYLON.SceneLoader.RegisterPlugin(new STLFileLoader());


const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);

function createScene(){
  const scene = new BABYLON.Scene(engine);

  scene.createDefaultCameraOrLight(true, false, true);

  return scene;
};

const scene = createScene();
const utilLayer = new BABYLON.UtilityLayerRenderer(scene);

const fileInput = document.getElementById('fileInput') as HTMLInputElement;

fileInput.addEventListener('change', async (event: Event) => {
  const target = event.target as HTMLInputElement;

  if (target.files && target.files.length > 0){
    const file = target.files[0];
    const fileReader = new FileReader();

    console.log(file);      

    fileReader.onload = (e) => {
      if(e.target && e.target.result){
        const arrayBuffer = e.target.result as ArrayBuffer;
        const blob = new Blob([arrayBuffer],{ type: "model/stl" });
        const url = URL.createObjectURL(blob);
  
        BABYLON.SceneLoader.ImportMesh(file.name, url, '', scene, (meshes) => {
          console.log('geladen');

          // scaling
          meshes[0].scaling.scaleInPlace(0.1);
          meshes[0].position.y = -1;

          // gizmo
          const positionGizmo = new BABYLON.PositionGizmo(utilLayer);
          positionGizmo.attachedMesh = meshes[0]

          // remove button
          const button = document.createElement('button');
          button.name = file.name;
          button.textContent = `${file.name} löschen`;
          button.onclick = () => {            
            meshes[0].dispose();
            positionGizmo.dispose();
            document.getElementById('interface')?.removeChild(button);
          };
          document.getElementById('interface')?.appendChild(button);
        }, undefined, undefined, ".stl");
      }
    };

    fileReader.readAsArrayBuffer(file);
  }
});


engine.runRenderLoop(() => {
  scene.render();
});