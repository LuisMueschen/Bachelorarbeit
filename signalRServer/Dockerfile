# Build-Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Nur csproj kopieren + restore → wird gecached!
COPY signalRServer.csproj ./
RUN dotnet restore

# Restlicher Code
COPY . ./
RUN dotnet publish -c Release -o /app/publish --no-restore -m:4

# Runtime-Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "signalRServer.dll"]
