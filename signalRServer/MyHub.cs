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

    public async Task SendMeshToBackend(string meshAsBase64, string fileName)
    {
        Console.WriteLine("sending mesh to backendd");
        await Clients.All.SendAsync("TransformMesh", meshAsBase64, fileName);
    }

    public async Task SendMeshToFrontend(string meshAsBase64, string fileName)
    {
        Console.WriteLine("Sending Transformed Mesh to Frontend");
        await Clients.All.SendAsync("TransformedMesh", meshAsBase64, fileName);
    }
}
