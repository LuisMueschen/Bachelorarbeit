import { selectedCoordinates, addMeshToScene } from "./main";
import * as signalR from "@microsoft/signalr";

export var serverAdress: string;
var connection: signalR.HubConnection

export async function createAndStartConnection() {
  const config = await fetch("cfg/config.json").then(res => res.json()).then(data => data)
  serverAdress = config["brokerAddress"]
  if(serverAdress.includes("://0.0.0.0:")){
    serverAdress = serverAdress.replace("://0.0.0.0:", "://localhost:")
  }
  
  // Connection to ASP.NET Server
  connection = new signalR.HubConnectionBuilder()
  .withUrl(`${serverAdress}/taskBroker`)
  .withAutomaticReconnect({
    nextRetryDelayInMilliseconds: retryContext => {
      return Math.min(1000 * (retryContext.previousRetryCount + 1), 10000);
    }
  })
  .build();

  // starting connection to ASP.NET and immediatly registering for group "frontend"
  connection.start().then(() => connection.invoke("register", "frontend"));

  connection.onreconnecting(() => console.log("Verbindung verloren"))

  connection.onreconnected(() => {
    connection.invoke("register", "frontend")
    console.log("Verbunden")
  })

  // downloading file from backend endpoint and importing it into the scene
  connection.on("MeshTransformed", (filename, relief) => {
    console.log(`Mesh bearbeitet ${filename}`)
    downloadFileIntoScene(filename)
    .then((file) => {
      addMeshToScene(file, relief)
    })
  });

  connection.on("TaskFailed", () => {
  alert("Operation Fehlgeschlagen. Bitte erneut versuchen")
  });

  // debug event
  connection.on("ReceiveMessage", (data) => {
    console.log(`message received: ${data}`);
  });

  setupDebugButtons();
}

// Downloading a File from Backend and returning a file object
async function downloadFileIntoScene(filename: string): Promise<File>{
  const response = await fetch(`${serverAdress}/download/${filename}`);
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

export function requestScraping(file: File, parameters: Object){  
  const formData = new FormData();
  formData.append('file', file);

  // Checking if exactly 5 points are selected
  if(selectedCoordinates[file.name] && selectedCoordinates[file.name].length === 5){
    // Uploading file to manipulate
    fetch(`${serverAdress}/upload`, {
      method: "POST",
      body: formData
    })
    .then((res) => res.json())
    .then((response) => {
      console.log(response.filename, 'hochgeladen');
      // Inform Backend about Upload and request execution of scraping script
      connection.invoke('RequestScraping', parameters);
    })
    .catch((err) => console.log("Fehler beim Upload:", err));
  }else{
    alert("Bitte wähle genau 5 Punkte aus")
  }
}

export function requestRelief(file: File, parameters: Object){
  const formData = new FormData();
  formData.append('file', file)

  fetch(`${serverAdress}/upload`, {
    method: "POST",
    body: formData
  }).then((res) => res.json())
  .then(() => {
    connection.invoke("requestNewRelief", parameters)    
  })
}
function setupDebugButtons(){
  // dummy task button
  const dummyTaskButton = document.createElement("button");
  dummyTaskButton.className = "debugButton";
  dummyTaskButton.textContent = 'Dummy Task starten'
  dummyTaskButton.onclick = () => {
    connection.invoke("RequestNewDummyTask")
  }
  document.getElementById("interface")?.appendChild(dummyTaskButton)
  
  // debug button
  const comCheckButton = document.createElement("button");
  comCheckButton.className = "debugButton";
  comCheckButton.textContent = "communication check";
  comCheckButton.onclick = () => {
    connection.invoke('SendToBackend', 'Hello Backend!');
  };
  document.getElementById("interface")?.appendChild(comCheckButton)
}