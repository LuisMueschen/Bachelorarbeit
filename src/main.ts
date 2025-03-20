import * as BABYLON from 'babylonjs';

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
const engine = new BABYLON.Engine(canvas);

function createScene(){
  const scene = new BABYLON.Scene(engine);

  scene.createDefaultCameraOrLight(true, false, true);

  return scene;
};

const scene = createScene()

engine.runRenderLoop(() => {
  scene.render();
});