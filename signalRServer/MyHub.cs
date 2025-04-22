using Microsoft.AspNetCore.SignalR;

public class MyHub : Hub
{
    public async Task SendToBackend(string payload)
    {
        Console.WriteLine($"Vom Frontend empfangen: {payload}");
        await Clients.All.SendAsync("CheckConnection", payload);
    }

    public async Task SendToFrontend(string payload)
    {
        Console.WriteLine($"Vom Backend empfangen: {payload}");
        await Clients.All.SendAsync("ReceiveMessage", payload);
    }

    public async Task NotifyBackendAboutFileUpload(string filename)
    {
        Console.WriteLine("Datei wurde hochgeladen" + filename);
        await Clients.All.SendAsync("FileUploaded", filename);
    }

    public async Task NotifyFrontendAboutManipulatedMesh(string filename)
    {
        Console.WriteLine("Datei wurde Bearbeitet" + filename);
        
    }
}
