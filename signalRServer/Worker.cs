class Worker
{
    public string id;
    private Queue<TaskParameter> activeTasks = new Queue<TaskParameter>();

    public Worker(string workerId)
    {
        id = workerId;
    }

    public Queue<TaskParameter> getTasks()
    {
        return activeTasks;
    }

    public int getTaskCount()
    {
        return activeTasks.Count;
    }

    public void addTask(TaskParameter task)
    {
        activeTasks.Enqueue(task);
    }

    public void taskDone()
    {
        activeTasks.Dequeue();
    }

    public void printTasks()
    {
        foreach (var task in activeTasks)
        {
            Console.WriteLine(task);
        }
    }
}