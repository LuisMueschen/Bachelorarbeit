using System.Data;
using Microsoft.AspNetCore.SignalR;

public class MyHub : Hub
{
    public Task Register(string groupName){
        Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        Console.WriteLine($"Client {Context.ConnectionId} mit Gruppe {groupName} verbunden");
        return Task.CompletedTask;
    }
    public async Task Ping(){
        await Clients.Caller.SendAsync("Connected");
    }
    public async Task SendToBackend(string payload)
    {
        Console.WriteLine($"Vom Frontend empfangen: {payload}");
        await Clients.Group("backend").SendAsync("CheckConnection", payload);
    }

    public async Task SendToFrontend(string payload)
    {
        Console.WriteLine($"Vom Backend empfangen: {payload}");
        await Clients.Group("frontend").SendAsync("ReceiveMessage", payload);
    }

    public async Task NotifyBackendAboutFileUpload(string filename)
    {
        Console.WriteLine("Datei wurde hochgeladen: " + filename);
        await Clients.Group("backend").SendAsync("FileUploaded", filename);
    }

    public async Task NotifyFrontendAboutManipulatedMesh(string filename)
    {
        Console.WriteLine("Mesh wurde bearbeitet: " + filename);
        await Clients.Group("frontend").SendAsync("MeshTransformed", filename);
    }
}
