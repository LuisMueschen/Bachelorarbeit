class Worker
{
    public string id;
    private int taskCount = 0;

    public Worker(string workerId)
    {
        id = workerId;
    }
    public int getTaskCount()
    {
        return taskCount;
    }

    public void increaseTaskCount()
    {
        taskCount++;
    }

    public void decreaseTaskCount()
    {
        taskCount--;
    }
}