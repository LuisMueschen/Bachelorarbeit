using Microsoft.AspNetCore.SignalR;

public class TaskBroker : Hub
{
    private readonly ILogger<TaskBroker> _logger;

    public TaskBroker(ILogger<TaskBroker> logger)
    {
        _logger = logger;
    }

    private static List<Worker> workerPool = new List<Worker>();

    public static void PrintWorkers()
    // 
    // called when pressing w key inside console to print a list of all current workers and their task counts
    // 
    {
        Console.WriteLine("\n\n\nAktuelle Worker-Liste:");
        foreach (var worker in workerPool)
        {
            Console.WriteLine($"WorkerId: {worker.id}, Tasks: {worker.getTaskCount()}");
            worker.printTasks();
        }
        if (workerPool.Count == 0)
        {
            Console.WriteLine("Keine Worker registriert.");
        }
    }

    private static Worker? GetWorker()
    // 
    // called to get the worker from the workerPool with the lowest current task count
    // 
    {
        // checking if workers exist
        if (workerPool != null && workerPool.Count != 0)
        {
            // returning the worker with the least tasks
            var minWorker = workerPool.MinBy(static worker => worker.getTaskCount());
            return minWorker != null ? minWorker : null;
        }
        else
        {
            return null;
        }
    }

    private static void HandleWorkerReturn(string workerId)
    // 
    // called after a has either finished a task or an error occured during a task
    // 
    // Used to decrease a workers task count down to 0
    // 
    {
        // getting worker with according ID
        Worker? worker = workerPool.FirstOrDefault(worker => worker.id == workerId);

        worker?.taskDone();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    // 
    // called if a client (both Frontend and Worker) disconects from the Server.
    // 
    // Used to Remove worker from WorkerPool after worker disconects and redistribute posibly unfinished tasks to other workers
    // 
    {
        string ConnectionId = Context.ConnectionId;

        Worker? worker = workerPool.FirstOrDefault(worker => worker.id == ConnectionId);

        if (worker != null)
        {
            // redistributing unfinished tasks to new workers
            foreach (var taskParameter in worker.getTasks())
            {
                switch (taskParameter.type)
                {
                    case 0:
                        await RequestNewDummyTask();
                        break;
                    case 1:
                        await RequestScraping((ScrapingParameters)taskParameter);
                        break;
                    case 2:
                        await RequestNewRelief((ReliefParameters)taskParameter);
                        break;
                }
            }

            workerPool.Remove(worker);
            _logger.LogInformation(ConnectionId + " aus Workerliste entfernt");
        }

        await base.OnDisconnectedAsync(exception);
    }

    public Task Register(string groupName)
    // 
    // called by every client immediatly after connecting
    // 
    // used to asign clients to groups Frontend and Worker. Also used to add Workers to WorkerPool when connecting
    // 
    {
        // checking if registering client is worker and adding it to workerpool
        if (groupName == "worker")
        {
            workerPool.Add(new Worker(Context.ConnectionId));
        }

        // adding registering client to their signalR group
        Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        _logger.LogInformation($"{Context.ConnectionId} mit Gruppe {groupName} verbunden");
        return Task.CompletedTask;
    }

    public async Task Ping()
    // 
    // Called by worker clients to maintain connection and implement automatic reconnect
    // 
    {
        // sending message to the client that called this method
        await Clients.Caller.SendAsync("Connected");
    }

    public async Task SendToBackend(string payload)
    // 
    // Called by Frontend Clients to check if there is a connection between Frontend and Workers
    // 
    {
        _logger.LogInformation($"Vom Frontend empfangen: {payload}");

        // sending the given message to all of the connected worker clients
        await Clients.Group("worker").SendAsync("CheckConnection", payload);
    }

    public async Task SendToFrontend(string payload)
    // 
    // Called by Worker Clients to check if there is a connection between Frontend and Workers
    // 
    {
        _logger.LogInformation($"Vom Backend empfangen: {payload}");

        // sending the given message to all of the connected frontend clients
        await Clients.Group("frontend").SendAsync("ReceiveMessage", payload);
    }

    public async Task RequestScraping(ScrapingParameters parameters)
    // 
    // Called by frontend clients to start new scraping-task with given parameters
    // 
    {
        // getting a worker and its connectionID
        Worker? worker = GetWorker();
        string? workerId = worker != null ? worker.id : null;

        // ensuring worker exists 
        if (worker != null && workerId != null)
        {
            // logging parameters for scraping
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

            // increasing task count of worker for load balancing
            worker.addTask(parameters);

            // sending NewScrapingTask message to worker with necessary arguments and connectionID of Frontend which initiated the task
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
    // 
    // Called by frontend clients to start new relief-task with given parameters
    // 
    {
        // getting a worker and its connectionID
        Worker? worker = GetWorker();
        string? workerId = worker != null ? worker.id : null;

        // ensuring worker exists 
        if (worker != null && workerId != null)
        {
            // logging parameters for relief creation
            _logger.LogInformation("Relief mit folgenden Parametern angefordert:\n" +
                "filename: " + parameters.filename + "\n" +
                "scaleX: " + parameters.scaleX + "\n" +
                "scaleY: " + parameters.scaleY + "\n" +
                "scaleZ: " + parameters.scaleZ + "\n" +
                "baseThickness: " + parameters.baseThickness + "\n" +
                "invert: " + parameters.invert + "\n"
            );

            // increasing task count of worker for load balancing
            worker.addTask(parameters);

            // sending NewReliefTask message to worker with necessary arguments and connectionID of Frontend which initiated the task
            await Clients.Client(workerId).SendAsync("NewReliefTask", new
            {
                filename = parameters.filename,
                scaleX = parameters.scaleX,
                scaleY = parameters.scaleY,
                scaleZ = parameters.scaleZ,
                baseThickness = parameters.baseThickness,
                invert = parameters.invert,
                connectionID = Context.ConnectionId
            });
        }
        else
        {
            _logger.LogInformation("Kein worker gefunden");
        }

    }
    
    public async Task RequestNewDummyTask()
    // 
    // Called by frontend clients to start new dummy-task for debuging purposses
    // 
    {
        // getting a worker and its connectionID
        Worker? worker = GetWorker();
        string? workerId = worker != null ? worker.id : null;

        // ensuring worker exists 
        if (worker != null && workerId != null)
        {
            _logger.LogInformation("dummy task gestartet für " + workerId);

            // increasing task count of worker for load balancing
            worker.addTask(new TaskParameters());
            
            // sending NewDummyTask message to worker with connectionID of Frontend which initiated the task
            await Clients.Client(workerId).SendAsync("NewDummyTask", Context.ConnectionId);
        }
    }
    
    public async Task NotifyFrontendAboutManipulatedMesh(string filename, string frontendClientId, bool relief=false)
    // 
    // called by worker clients to inform a frontend client about a finished scraping or relief task, so that the frontend can download the finished file
    // 
    {
        _logger.LogInformation("Mesh wurde bearbeitet: " + filename);

        // decreasing the task count of the calling worker
        HandleWorkerReturn(Context.ConnectionId);

        // sending the name of the finished file to the frontend
        await Clients.Client(frontendClientId).SendAsync("MeshTransformed", filename, relief);
    }

    public async Task ManipulationError(string frontendClientId)
    // 
    // called by worker clients to inform a frontend client abount an error during a scraping or relief task
    // 
    {
        _logger.LogInformation("Task Fehlgeschlagen");

        // decreasing the task count of the calling worker
        HandleWorkerReturn(Context.ConnectionId);

        // sending the message to the frontend
        await Clients.Client(frontendClientId).SendAsync("TaskFailed");
    }
}