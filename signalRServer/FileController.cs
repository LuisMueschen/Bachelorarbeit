using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

[ApiController]
[Route("[controller]")]
public class FileController : ControllerBase
{
    private readonly FileCleanupConfig _fileCleanupConfig;
    private readonly ILogger<FileController> _logger;

    public FileController(IOptions<FileCleanupConfig> fileCleanupConfig, ILogger<FileController> logger)
    {
        _fileCleanupConfig = fileCleanupConfig.Value;
        _logger = logger;
    }
    
    [RequestSizeLimit(104857600)]/*100mb*/
    [HttpPost("/upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Keine Datei hochgeladen");
        }

        string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), _fileCleanupConfig.UploadPath);
        string filePath = Path.Combine(uploadPath, file.FileName);

        using (FileStream stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        _logger.LogInformation(file.FileName + " Hochgeladen");

        return Ok(new { filename = file.FileName });
    }

    [HttpGet("/download/{filename}")]
    public IActionResult Download(string filename)
    {
        string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), _fileCleanupConfig.UploadPath);
        string filePath = Path.Combine(uploadPath, filename);

        if (!System.IO.File.Exists(filePath))
        {
            NotFound("Datei nicht gefunden");
        }

        var content = System.IO.File.ReadAllBytes(filePath);
        var mimeType = "application/octet-stream";

        _logger.LogInformation(filename + " Runtergeladen");

        return File(content, mimeType, filename);
    }
}