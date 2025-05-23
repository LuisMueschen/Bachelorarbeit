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

builder.WebHost.UseUrls("http://0.0.0.0:5500");

var app = builder.Build();

app.UseCors();

// Routen definieren
app.MapHub<MyHub>("/myhub");

app.Run();