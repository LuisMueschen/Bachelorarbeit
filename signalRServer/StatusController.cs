using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("[controller]")]
public class StatusController : ControllerBase
{
    [HttpGet("/status")]
    public string PrintStatusPage()
    {
        return TaskBroker.GetWorkerListAsString();
    }
}