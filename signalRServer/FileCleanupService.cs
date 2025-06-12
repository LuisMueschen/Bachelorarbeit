
using Microsoft.Extensions.Options;

public class FileCleanupConfig
{
    required public string UploadPath {get; set;}
    required public int FileSaveDuration {get; set;}
}
public class FileCleanupService : BackgroundService
{
    private readonly FileCleanupConfig _config;
    private readonly ILogger<FileCleanupService> _logger;
    private readonly TimeSpan _checkIntervall = TimeSpan.FromMinutes(5);

    public FileCleanupService(IOptions<FileCleanupConfig> config, ILogger<FileCleanupService> logger)
    {
        _config = config.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stopToken)
    {
        _logger.LogInformation("cleanup service started");
        while (!stopToken.IsCancellationRequested)
        {
            try
            {
                var dir = Path.Combine(Directory.GetCurrentDirectory(), _config.UploadPath);

                if (Directory.Exists(dir))
                {
                    var saveDuration = TimeSpan.FromMinutes(_config.FileSaveDuration);
                    var now = DateTime.UtcNow;


                    foreach (var file in Directory.GetFiles(dir))
                    {
                        var info = new FileInfo(file);
                        if (now - info.CreationTimeUtc > saveDuration)
                        {
                            _logger.LogInformation($"Deleting file: {info.Name}");
                            info.Delete();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during cleanup");
            }

            await Task.Delay(_checkIntervall, stopToken);
        }
    }
}