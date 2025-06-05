using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// CORS hinzufügen
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
            .SetIsOriginAllowed(origin => true); // Für Entwicklung
    });
});

builder.Services.AddSignalR();
builder.Services.AddControllers();

builder.WebHost.UseUrls("http://0.0.0.0:5500");

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

var uploadPath = Path.Combine(app.Environment.ContentRootPath, "Uploads");
if (!Directory.Exists(uploadPath))
{
    Directory.CreateDirectory(uploadPath);
}

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