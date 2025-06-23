import * as BABYLON from 'babylonjs'
import { serverAdress, requestRelief, requestScraping } from "./signalRClient";
import { selectedCoordinates, coordinateSpheres } from "./main";

// creating the html interface to input parameters and interact with mesh
export function createMeshInterface(
  file: File,
  mesh: BABYLON.Mesh, 
  positionGizmo: BABYLON.PositionGizmo, 
  rotationGizmo: BABYLON.RotationGizmo,
  meshMat: BABYLON.StandardMaterial,
  relief: boolean = false
): void {

  // parrent div containing the following objects
  const objectDiv = document.createElement('div');
  objectDiv.className = 'objectDiv';
  document.getElementById('interface')?.appendChild(objectDiv);

  const filenameLabel = document.createElement("label");
  filenameLabel.textContent = file.name;
  filenameLabel.className = "filenameLabel"
  objectDiv.appendChild(filenameLabel)

  const buttonDiv = document.createElement("div")
  buttonDiv.className = "buttonDiv"

  if(!relief){ 
    // parameter inputs
    const supportDiameterLabel = document.createElement("label")
    const supportDiameterInput = document.createElement("input")
    supportDiameterInput.type = "number"
    supportDiameterInput.value = "1.5"
    supportDiameterInput.min = "0.1"
    supportDiameterInput.id = "supportDiameterInput"
    supportDiameterLabel.textContent = "Durchmesser der Stütze in mm"
    objectDiv.appendChild(supportDiameterLabel)
    objectDiv.appendChild(supportDiameterInput)

    const edgeWidthLabel = document.createElement("label")
    const edgeWidthInput = document.createElement("input")
    edgeWidthInput.type = "number"
    edgeWidthInput.value = "2"
    edgeWidthInput.min = "0.1"
    edgeWidthInput.id = "edgeWidthInput"
    edgeWidthLabel.textContent = "Breite des Randes in mm"
    objectDiv.appendChild(edgeWidthLabel)
    objectDiv.appendChild(edgeWidthInput)

    const transitionWidthLabel = document.createElement("label")
    const transitionWidthInput = document.createElement("input")
    transitionWidthInput.type = "number"
    transitionWidthInput.value = "1"
    transitionWidthInput.min = "0.1"
    transitionWidthInput.id = "transitionWidthInput"
    transitionWidthLabel.textContent = "Breite des Übergangs in mm"
    objectDiv.appendChild(transitionWidthLabel)
    objectDiv.appendChild(transitionWidthInput)

    const targetWallThicknessLabel = document.createElement("label")
    const targetWallThicknessInput = document.createElement("input")
    targetWallThicknessInput.type = "number"
    targetWallThicknessInput.value = "0.3"
    targetWallThicknessInput.min = "0.1"
    targetWallThicknessInput.id = "targetWallThicknessInput"
    targetWallThicknessLabel.textContent = "Gewünschte Wandstärke in mm"
    objectDiv.appendChild(targetWallThicknessLabel)
    objectDiv.appendChild(targetWallThicknessInput)
    
    const targetTopThicknessLabel = document.createElement("label")
    const targetTopThicknessInput = document.createElement("input")
    targetTopThicknessInput.type = "number"
    targetTopThicknessInput.value = "0.5"
    targetTopThicknessInput.min = "0.1"
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

  
    // button to start scraping
    const scrapeButton = document.createElement('button');
    scrapeButton.textContent = `auskratzen`;
    scrapeButton.className = 'uploadBtn'; 
    scrapeButton.onclick = () => {
      if(finalFilenameInput.value !== file.name){
        requestScraping(file, {
        // necessary parameters for scraping
        selections: selectedCoordinates[file.name],
        supportDiameter: Number(supportDiameterInput.value),
        edgeWidth:  Number(edgeWidthInput.value),
        transitionWidth: Number(transitionWidthInput.value),
        targetWallThickness: Number(targetWallThicknessInput.value),
        targetTopThickness: Number(targetTopThicknessInput.value),
        fileToUse: file.name,
        finalFilename: finalFilenameInput.value
        });
      }else{
        alert("Bitte benenne die Neue Datei anders als die Alte")
      };
    };
    buttonDiv.appendChild(scrapeButton);
  }

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

  objectDiv.appendChild(buttonDiv)
}

export function createImageInterface(file: File){
  // Creating Div to contain this interface part
  const objectDiv = document.createElement("div")
  objectDiv.className = 'objectDiv'

  // Label displaying Filename for this interface
  const filenameLabel = document.createElement("label");
  filenameLabel.textContent = file.name;
  filenameLabel.className = "filenameLabel"
  objectDiv.appendChild(filenameLabel)

  const buttonDiv = document.createElement("div")
  buttonDiv.className = "buttonDiv"

  // Input elements for parameters for Relief creation
  const scaleXLabel = document.createElement("label");
  const scaleXInput = document.createElement("input");
  scaleXInput.type = "number";
  scaleXInput.value = "1.0"
  scaleXInput.min = "0.1"
  scaleXInput.step = "0.1"
  scaleXLabel.textContent = "X-Skalierung"
  objectDiv.appendChild(scaleXLabel)
  objectDiv.appendChild(scaleXInput)

  const scaleYLabel = document.createElement("label");
  const scaleYInput = document.createElement("input");
  scaleYInput.type = "number";
  scaleYInput.value = "1.0"
  scaleYInput.min = "0.1"
  scaleYInput.step = "0.1"
  scaleYLabel.textContent = "Y-Skalierung"
  objectDiv.appendChild(scaleYLabel)
  objectDiv.appendChild(scaleYInput)

  const scaleZLabel = document.createElement("label");
  const scaleZInput = document.createElement("input");
  scaleZInput.type = "number";
  scaleZInput.value = "1.0"
  scaleZInput.min = "0.1"
  scaleZInput.step = "0.1"
  scaleZLabel.textContent = "Z-Skalierung"
  objectDiv.appendChild(scaleZLabel)
  objectDiv.appendChild(scaleZInput)

  const baseThicknessLabel = document.createElement("label");
  const baseThicknessInput = document.createElement("input");
  baseThicknessInput.type = "number";
  baseThicknessInput.value = "1.0"
  baseThicknessInput.min = "0.1"
  baseThicknessInput.step = "0.1"
  baseThicknessLabel.textContent = "Bodendicke"
  objectDiv.appendChild(baseThicknessLabel)
  objectDiv.appendChild(baseThicknessInput)

  const invertLabel = document.createElement("label");
  const invertInput = document.createElement("input");
  invertInput.type = "checkbox"
  invertLabel.textContent = "Invertieren"
  objectDiv.appendChild(invertLabel)
  objectDiv.appendChild(invertInput)

  // Button to start creation of Relief
  const uploadButton = document.createElement("button")
  uploadButton.onclick = () => {    
    requestRelief(file, {
      filename: file.name,
      scaleX: Number(scaleXInput.value),
      scaleY: Number(scaleYInput.value),
      scaleZ: Number(scaleZInput.value),
      baseThickness: Number(baseThicknessInput.value),
      invert: invertInput.checked
    })
  }
  uploadButton.textContent = "Relief erstellen"
  buttonDiv.appendChild(uploadButton)

  // Button to remove this image interface
  const deleteButton = document.createElement('button');
  deleteButton.name = file.name;
  deleteButton.textContent = `löschen`;
  deleteButton.className = 'deleteBtn';
  deleteButton.onclick = () => {
    document.getElementById('interface')?.removeChild(objectDiv);
  }
  buttonDiv.appendChild(deleteButton)

  objectDiv.appendChild(buttonDiv)
  document.getElementById('interface')?.appendChild(objectDiv)
}