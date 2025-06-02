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

// SignalR-Dienste registrieren
builder.Services.AddSignalR();

builder.Services.AddControllers();

builder.WebHost.UseUrls("http://0.0.0.0:5500");

// Logging auf Debug-Level setzen
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug); // oder LogLevel.Trace für noch mehr Details

var app = builder.Build();

app.UseCors();

// Routen definieren
app.MapHub<MyHub>("/myhub");
app.UseRouting();
app.MapControllers();

app.Run();