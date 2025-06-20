class Worker
{
    public string id;
    private Queue<TaskParameters> activeTasks = new Queue<TaskParameters>();

    public Worker(string workerId)
    {
        id = workerId;
    }

    public Queue<TaskParameters> getTasks()
    {
        return activeTasks;
    }

    public int getTaskCount()
    {
        return activeTasks.Count;
    }

    public void addTask(TaskParameters task)
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