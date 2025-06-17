public class ScrapingParameters
{
    public required float[][] selections { get; set; }
    public required float supportDiameter { get; set; }
    public required float edgeWidth { get; set; }
    public required float transitionWidth { get; set; }
    public required float targetWallThickness { get; set; }
    public required float targetTopThickness { get; set; }
    public required string fileToUse { get; set; }
    public required string finalFilename { get; set; }
}

public class ReliefParameters
{
    public required string filename { get; set; }
    public required float scaleX { get; set; }
    public required float scaleY { get; set; }
    public required float scaleZ { get; set; }
    public required float baseThickness { get; set; }
    public required bool invert { get; set; }
}