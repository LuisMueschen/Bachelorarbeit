using Microsoft.AspNetCore.SignalR;

public class MyHub : Hub
{
    public async Task SendToBackend(string message)
    {
        Console.WriteLine($"Vom Frontend empfangen: {message}");
        // Hier könntest du das an dein Python-Backend weiterleiten
    }

    public async Task SendToFrontend(string connectionId, string message)
    {
        await Clients.Client(connectionId).SendAsync("ReceiveMessage", message);
    }
}
