using Microsoft.AspNetCore.SignalR;

public class ScrapingParameters
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

public class ReliefParameters
{
    public required string filename { get; set; }
    public required string scaleX { get; set; }
    public required string scaleY { get; set; }
    public required string scaleZ { get; set; }
    public required bool invert { get; set; }
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

    public static void PrintWorkers()
    {
        Console.WriteLine("Aktuelle Worker-Liste:");
        foreach (var worker in workers)
        {
            Console.WriteLine($"WorkerId: {worker.id}, Tasks: {worker.getTaskCount()}");
        }
        if (workers.Count == 0)
        {
            Console.WriteLine("Keine Worker registriert.");
        }
    }

    private static Worker? GetWorker()
    {
        // checking if workers exist
        if (workers != null && workers.Count != 0)
        {
            // returning the worker with the least tasks
            var minWorker = workers.MinBy(static worker => worker.getTaskCount());
            return minWorker != null ? minWorker : null;
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

    public async Task RequestScraping(ScrapingParameters parameters)
    {
        Worker? worker = GetWorker();
        string? workerId = worker != null ? worker.id : null;

        if (worker != null && workerId != null)
        {
            _logger.LogInformation("Auskratzen mit folgenden Parametern angefordert: \n" +
                "WorkerId: " + workerId + "\n\n" +
                "Punkte: " + parameters.selections + "\n" +
                "Stützendurchmesser: " + parameters.supportDiameter + "\n" +
                "Randdicke: " + parameters.edgeWidth + "\n" +
                "Übergangsbreite: " + parameters.transitionWidth + "\n" +
                "Okklusaldicke: " + parameters.targetTopThickness + "\n" +
                "Wanddicke: " + parameters.targetWallThickness + "\n" +
                "Dateiname alt: " + parameters.fileToUse + "\n" +
                "Dateiname neu: " + parameters.finalFilename + "\n"
            );

            worker.increaseTaskCount();
            await Clients.Client(workerId).SendAsync("NewScrapingTask", new
            {
                selections = parameters.selections,
                supportDiameter = parameters.supportDiameter,
                edgeWidth = parameters.edgeWidth,
                transitionWidth = parameters.transitionWidth,
                targetWallThickness = parameters.targetWallThickness,
                targetTopThickness = parameters.targetTopThickness,
                fileToUse = parameters.fileToUse,
                finalFilename = parameters.finalFilename,
                connectionID = Context.ConnectionId
            });
        }
        else
        {
            _logger.LogInformation("Kein worker gefunden");
        }
    }

    public async Task RequestNewRelief(ReliefParameters parameters)
    {
        Worker? worker = GetWorker();
        string? workerId = worker != null ? worker.id : null;

        if (worker != null && workerId != null)
        {
            _logger.LogInformation("Relief mit folgenden Parametern angefordert:\n" +
                "filename: " + parameters.filename + "\n" +
                "scaleX: " + parameters.scaleX + "\n" +
                "scaleY: " + parameters.scaleY + "\n" +
                "scaleZ: " + parameters.scaleZ + "\n" +
                "invert: " + parameters.invert + "\n"
            );

            worker.increaseTaskCount();
            await Clients.Client(workerId).SendAsync("NewReliefTask", new
            {
                filename = parameters.filename,
                scaleX = parameters.scaleX,
                scaleY = parameters.scaleY,
                scaleZ = parameters.scaleZ,
                invert = parameters.invert,
                connectionID = Context.ConnectionId
            });
        }

    }
    
    public async Task RequestNewDummyTask()
    {
        Worker? worker = GetWorker();
        string? workerId = worker != null ? worker.id : null;

        if (worker != null && workerId != null)
        {
            _logger.LogInformation("dummy task gestartet für " + workerId);
            worker.increaseTaskCount();
            await Clients.Client(workerId).SendAsync("NewDummyTask", Context.ConnectionId);
        }
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