using System.Data;
using Microsoft.AspNetCore.SignalR;

public class MyHub : Hub
{
    public static Dictionary<string, string> ConnectedClients = new();
    public Task Register(string clientID){

        ConnectedClients[clientID] = Context.ConnectionId;
        Console.WriteLine($"Client verbunden: {clientID}");
        return Task.CompletedTask;
    }
    public async Task Ping(){
        await Clients.Caller.SendAsync("Connected");
    }
    public async Task SendToBackend(string payload)
    {
        Console.WriteLine($"Vom Frontend empfangen: {payload}");
        await Clients.Client(ConnectedClients["backend"]).SendAsync("CheckConnection", payload);
    }

    public async Task SendToFrontend(string payload)
    {
        Console.WriteLine($"Vom Backend empfangen: {payload}");
        await Clients.Client(ConnectedClients["frontend"]).SendAsync("ReceiveMessage", payload);
    }

    public async Task NotifyBackendAboutFileUpload(string filename)
    {
        Console.WriteLine("Datei wurde hochgeladen: " + filename);
        await Clients.Client(ConnectedClients["backend"]).SendAsync("FileUploaded", filename);
    }

    public async Task NotifyFrontendAboutManipulatedMesh(string filename)
    {
        Console.WriteLine("Mesh wurde bearbeitet: " + filename);
        await Clients.Client(ConnectedClients["frontend"]).SendAsync("MeshTransformed", filename);
    }
}
