import { selectedCoordinates, coordinateSpheres, addMeshToScene } from "./main";
import * as signalR from "@microsoft/signalr";

// Server adresses
export const serverAdress = 'http://localhost:5500'

// Connection to ASP.NET Server
const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${serverAdress}/myhub`)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        return Math.min(1000 * (retryContext.previousRetryCount + 1), 10000);
      }
    })
    .build();

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

export function requestScraping(file: File, message: Object){  
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
      connection.invoke('RequestScraping', message);
    })
    .catch((err) => console.log("Fehler beim Upload:", err));
  }else{
    alert("Bitte wähle genau 5 Punkte aus")
  }
}

export function uploadImage(file: File){
  const formData = new FormData();
  formData.append('file', file)

  fetch(`${fileServerAdress}/upload`, {
    method: "POST",
    body: formData
  }).then((res) => res.json())
  .then(() => {
    connection.invoke("requestNewRelief", file.name)    
  })
}

// starting connection to ASP.NET and immediatly registering for group "frontend"
connection.start().then(() => connection.invoke("register", "frontend"));

connection.onreconnecting(() => console.log("Verbindung verloren"))

connection.onreconnected(() => {
  connection.invoke("register", "frontend")
  console.log("Verbunden")
})

// downloading file from backend endpoint and importing it into the scene
connection.on("MeshTransformed", (filename) => {
  console.log(`Mesh bearbeitet ${filename}`)
  downloadFileIntoScene(filename)
  .then((file) => {
    addMeshToScene(file)
  })
});

connection.on("ScrapingFailed", () => {
 alert("Auskratzen Fehlgeschlagen \n \nBitte nutze eine gültige Datei und wähle korrekte Punkte aus")
});

// debug event
connection.on("ReceiveMessage", (data) => {
  console.log(`message received: ${data}`);
});

// debug button
const comCheckButton = document.getElementById("communicationCheckButton");
if (comCheckButton) {
  comCheckButton.onclick = () => {
    connection.invoke('SendToBackend', 'Hello Backend!');
    console.log(selectedCoordinates);
    console.log(coordinateSpheres);
  };
}