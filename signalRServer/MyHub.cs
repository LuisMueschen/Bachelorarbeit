using System.Data;
using Microsoft.AspNetCore.SignalR;

public class TaskMessage
{
    public required float[][] selections { get; set; }
    public required string supportDiameter { get; set; }
    public required string edgeWidth { get; set; }
    public required string transitionWidth { get; set; }
    public required string targetWallThickness { get; set; }
    public required string targetTopThickness { get; set; }
    public required string fileToUse { get; set; }
    public required string finalFilename { get; set; }
}
public class MyHub : Hub
{
    public Task Register(string groupName)
    {
        Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        Console.WriteLine($"Client {Context.ConnectionId} mit Gruppe {groupName} verbunden");
        return Task.CompletedTask;
    }
    public async Task Ping()
    {
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

    public async Task RequestScraping(TaskMessage message)
    {
        Console.WriteLine("Auskratzen mit folgenden Parametern angefordert: \n" +
            "Punkte; " + message.selections + "\n" +
            "Stützendurchmesse: " + message.supportDiameter + "\n" +
            "Randdicke: " + message.edgeWidth + "\n" +
            "Übergangsbreite: " + message.transitionWidth + "\n" +
            "Okklusaldicke: " + message.targetTopThickness + "\n" +
            "Wanddicke: " + message.targetWallThickness + "\n" +
            "Dateiname alt: " + message.fileToUse + "\n" +
            "Dateiname neu: " + message.finalFilename + "\n"
        );
        await Clients.Group("backend").SendAsync("NewScrapingTask", new
        {
            selections = message.selections,
            supportDiameter = message.supportDiameter,
            edgeWidth = message.edgeWidth,
            transitionWidth = message.transitionWidth,
            targetWallThickness = message.targetWallThickness,
            targetTopThickness = message.targetTopThickness,
            fileToUse = message.fileToUse,
            finalFilename = message.finalFilename,
            connectionID = Context.ConnectionId
        });
    }

    public async Task NotifyFrontendAboutManipulatedMesh(string filename, string connectionID)
    {
        Console.WriteLine("Mesh wurde bearbeitet: " + filename);
        await Clients.Client(connectionID).SendAsync("MeshTransformed", filename);
    }

    public async Task NotifyFrontendAboutManipulationError(string connectionID)
    {
        Console.WriteLine("Auskratzen Fehlgeschlagen");
        await Clients.Client(connectionID).SendAsync("ScrapingFailed");
    }
}
