var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("cfg/config.json", optional: false, reloadOnChange: true);

builder.Services.Configure<FileCleanupConfig>(builder.Configuration.GetSection("fileCleanup"));

// CORS hinzufügen
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .WithOrigins("http://localhost:8080");
            // .SetIsOriginAllowed(origin => true); // Für Entwicklung

    });
});

builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddHostedService<FileCleanupService>();

var address = builder.Configuration["address"];
if (address != null)
{
    builder.WebHost.UseUrls(address);
}

var uploadPath = builder.Configuration.GetSection("fileCleanup")["uploadPath"];
if (uploadPath != null && !Directory.Exists(uploadPath))
{
    Directory.CreateDirectory(uploadPath);
}

// setting log level to debug
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

var app = builder.Build();

app.UseCors();

// defining routes
app.MapHub<MyHub>("/myhub");
app.UseRouting();
app.MapControllers();

// reacting to press of "w" key during runtime to print workerlist
_ = Task.Run(() =>
{
    while (true)
    {
        var key = Console.ReadKey(true);
        if (key.Key == ConsoleKey.W)
        {
            MyHub.PrintWorkers();
        }
    }
});

app.Run();