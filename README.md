# Eine Verteilte Anwendung zur Manipulation von 3D-Modellen

## Start der Anwendungen:

### Starten der Docker Container
```
Docker run --network host worker:latest
Docker run -p 5500:5500 asp.net:latest
Docker run -p 8080:8080 frontend:latest
```

### Zum starten des Frontend Dev Servers
```
CD /fronend
npm run dev
```

### Zum starten des normalen Flask Frontend Servers (benötigt compiltes Frontend)
```
CD /frontend
python3 frontendServer.py
```

### Zum starten des ASP.NET SignalR Servers
```
CD /signalRServer
dotnet run
```

### Zum starten des Backend Clients & Servers
```
CD /backend
python3 backend.py
```

## Bauen der Anwendungen

### Zum Compilen der Frontend Anwendung
```
CD /frontend
npm run build
```

### Bauen der Docker Images
```
Docker build -t frontend:latest frontend/
Docker build -t asp.net:latest signalRServer/
Docker build -t worker:latest worker/
```