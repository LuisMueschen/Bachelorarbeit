using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("[controller]")]
public class FileController : ControllerBase
{
    [RequestSizeLimit(104857600)]
    [HttpPost("/upload")]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("Keine Datei hochgeladen");
        }

        string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
        string filePath = Path.Combine(uploadPath, file.FileName);

        using (FileStream stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        Console.WriteLine(file.FileName + " Hochgeladen");

        return Ok(new { filename = file.FileName });
    }

    [HttpGet("/download/{filename}")]
    public IActionResult Download(string filename)
    {
        Console.WriteLine("am anfang von download");
        string uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
        string filePath = Path.Combine(uploadPath, filename);

        if (!System.IO.File.Exists(filePath))
        {
            NotFound("Datei nicht gefunden");
        }

        var content = System.IO.File.ReadAllBytes(filePath);
        var mimeType = "application/octet-stream";

        Console.WriteLine(filename + " Runtergeladen");

        return File(content, mimeType, filename);
    }
}