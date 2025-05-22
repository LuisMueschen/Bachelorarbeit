import { selectedCoordinates, coordinateSpheres, addMeshToScene } from "./main";
import * as signalR from "@microsoft/signalr";

// Server adresses
export const dotnetAdress = 'http://localhost:5500/myhub'
export const fileServerAdress = 'http://localhost:5000'

// Connection to ASP.NET Server
const connection = new signalR.HubConnectionBuilder()
    .withUrl(dotnetAdress)
    .withAutomaticReconnect({
      nextRetryDelayInMilliseconds: retryContext => {
        return Math.min(1000 * (retryContext.previousRetryCount + 1), 10000);
      }
    })
    .build();

// Old function for streching proof of concept
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

// Downloading a File from Backend and returning a file object
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

export function requestScraping(file: File, message: Object){  
  const formData = new FormData();
  formData.append('file', file);

  // Checking if exactly 5 points are selected
  if(selectedCoordinates[file.name] && selectedCoordinates[file.name].length === 5){
    // Uploading file to manipulate
    fetch(`${fileServerAdress}/upload`, {
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