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

class Worker
{
    public string id;
    private int taskCount = 0;

    public Worker(string workerId)
    {
        id = workerId;
    }
    public int getTaskCount()
    {
        return taskCount;
    }

    public void increaseTaskCount()
    {
        taskCount++;
    }

    public void decreaseTaskCount()
    {
        taskCount--;
    }
}
public class MyHub : Hub
{
    private readonly ILogger<MyHub> _logger;

    public MyHub(ILogger<MyHub> logger)
    {
        _logger = logger;
    }

    private static List<Worker> workers = new List<Worker>();

    private static string? GetWorkerId()
    {
        // checking if workers exist
        if (workers != null && workers.Count != 0)
        {
            // returning the worker with the least tasks
            var minWorker = workers.MinBy(static worker => worker.getTaskCount());
            return minWorker != null ? minWorker.id : null;
        }
        else
        {
            return null;
        }
    }

    private static void HandleWorkerReturn(string workerId)
    {
        Worker? worker = workers.FirstOrDefault(worker => worker.id == workerId);

        if (worker != null && worker.getTaskCount() > 0)
        {
            worker.decreaseTaskCount();
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string ConnectionId = Context.ConnectionId;

        Worker? worker = workers.FirstOrDefault(worker => worker.id == ConnectionId);

        if (worker != null)
        {
            workers.Remove(worker);
            _logger.LogInformation(ConnectionId + " aus Workerliste entfernt");
        }

        await base.OnDisconnectedAsync(exception);
    }

    public Task Register(string groupName)
    {
        if (groupName == "worker")
        {
            workers.Add(new Worker(Context.ConnectionId));
        }

        Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogInformation($"{Context.ConnectionId} mit Gruppe {groupName} verbunden");
        return Task.CompletedTask;
    }

    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Connected");
    }

    public async Task SendToBackend(string payload)
    {
        _logger.LogInformation($"Vom Frontend empfangen: {payload}");
        await Clients.Group("worker").SendAsync("CheckConnection", payload);
    }

    public async Task SendToFrontend(string payload)
    {
        _logger.LogInformation($"Vom Backend empfangen: {payload}");
        await Clients.Group("frontend").SendAsync("ReceiveMessage", payload);
    }

    public async Task RequestScraping(TaskMessage message)
    {
        _logger.LogInformation("Auskratzen mit folgenden Parametern angefordert: \n" +
            "Punkte; " + message.selections + "\n" +
            "Stützendurchmesser: " + message.supportDiameter + "\n" +
            "Randdicke: " + message.edgeWidth + "\n" +
            "Übergangsbreite: " + message.transitionWidth + "\n" +
            "Okklusaldicke: " + message.targetTopThickness + "\n" +
            "Wanddicke: " + message.targetWallThickness + "\n" +
            "Dateiname alt: " + message.fileToUse + "\n" +
            "Dateiname neu: " + message.finalFilename + "\n"
        );

        string? workerId = GetWorkerId();

        if (workerId != null)
        {
            _logger.LogInformation(workerId+'\n');
            await Clients.Client(workerId).SendAsync("NewScrapingTask", new
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
        else
        {
            _logger.LogInformation("Kein worker gefunden");
        }
    }

    public async Task RequestNewRelief(string filename)
    {
        _logger.LogInformation(filename + " hochgeladen");
        await Clients.Group("backend").SendAsync("NewReliefTask", filename, Context.ConnectionId);
    }
    
    public async Task NotifyFrontendAboutManipulatedMesh(string filename, string frontendClientId)
    {
        _logger.LogInformation("Mesh wurde bearbeitet: " + filename);
        HandleWorkerReturn(Context.ConnectionId);
        await Clients.Client(frontendClientId).SendAsync("MeshTransformed", filename);
    }

    public async Task NotifyFrontendAboutManipulationError(string frontendClientId)
    {
        _logger.LogInformation("Auskratzen Fehlgeschlagen");
        HandleWorkerReturn(Context.ConnectionId);
        await Clients.Client(frontendClientId).SendAsync("ScrapingFailed");
    }
}