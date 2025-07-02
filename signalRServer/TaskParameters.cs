public class TaskParameter
{
    public virtual int type => 0;

    public override string ToString()
    {
        return "Type: " + type + "\n";
    }
}

public class ScrapingParameters : TaskParameter
{
    public override int type => 1;
    public required float[][] selections { get; set; }
    public required float supportDiameter { get; set; }
    public required float edgeWidth { get; set; }
    public required float transitionWidth { get; set; }
    public required float targetWallThickness { get; set; }
    public required float targetTopThickness { get; set; }
    public required string fileToUse { get; set; }
    public required string finalFilename { get; set; }

    public override string ToString()
    {
        return
        "    type: " + type + "\n" +
        "    supportDiameter: " + supportDiameter + "\n" +
        "    edgeWidth: " + edgeWidth + "\n" +
        "    transitionWidth: " + transitionWidth + "\n" +
        "    targetWallThickness: " + targetWallThickness + "\n" +
        "    targetTopThickness: " + targetTopThickness + "\n" +
        "    fileToUse: " + fileToUse + "\n" +
        "    finalFilename: " + finalFilename + "\n"
        ;
    }
}

public class ReliefParameters : TaskParameter
{
    public override int type => 2;
    public required string filename { get; set; }
    public required float scaleX { get; set; }
    public required float scaleY { get; set; }
    public required float scaleZ { get; set; }
    public required float baseThickness { get; set; }
    public required bool invert { get; set; }

    public override string ToString()
    {
        return
        "    type: " + type + "\n" +
        "    filename: " + filename + "\n" +
        "    scaleX: " + scaleX + "\n" +
        "    scaleY: " + scaleY + "\n" +
        "    scaleZ: " + scaleZ + "\n" +
        "    baseThickness: " + baseThickness + "\n" +
        "    invert: " + invert + "\n"
        ;
    }
}