import { useEffect, useState } from "react";
import { supabase } from "../supabase-client";
import { DeleteIcon, Pencil, Trash2Icon } from "lucide-react";

function TaskManager({ session }) {
  const [newTask, setNewTask] = useState({ title: "", description: "" });
  const [tasks, setTasks] = useState([]);
  const [newDescription, setNewDescription] = useState("");
  const [taskImage, setTaskImage] = useState(null);

  // ✅ Fetch all tasks
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error reading task: ", error.message);
      return;
    }

    setTasks(data);
  };

  // 🗑️ Delete task
  const deleteTask = async (id) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Error deleting task: ", error.message);
    }
  };

  // ✏️ Update task description
  const updateTask = async (id) => {
    const { error } = await supabase
      .from("tasks")
      .update({ description: newDescription })
      .eq("id", id);

    if (error) {
      console.error("Error updating task: ", error.message);
    }
  };

  // 📤 Upload image to Supabase Storage
  const uploadImage = async (file) => {
    const filePath = `${file.name}-${Date.now()}`;
    const { error } = await supabase.storage.from("tasks-images").upload(filePath, file);

    if (error) {
      console.error("Error uploading image:", error.message);
      return null;
    }

    const { data } = await supabase.storage.from("tasks-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ➕ Add new task
  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrl = null;
    if (taskImage) {
      imageUrl = await uploadImage(taskImage);
    }

    const { error } = await supabase
      .from("tasks")
      .insert({
        ...newTask,
        email: session.user.email,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding task: ", error.message);
      return;
    }

    setNewTask({ title: "", description: "" });
    setTaskImage(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setTaskImage(e.target.files[0]);
    }
  };

  // ⬇️ Fetch tasks on load
  useEffect(() => {
    fetchTasks();
  }, []);

  // 🔔 Real-time updates
  useEffect(() => {
    const channel = supabase.channel("tasks-channel");

    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, (payload) => {
        const newTask = payload.new;
        setTasks((prev) => [...prev, newTask]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        setTasks((prev) =>
          prev.map((task) => (task.id === payload.new.id ? payload.new : task))
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, (payload) => {
        setTasks((prev) => prev.filter((task) => task.id !== payload.old.id));
      })
      .subscribe((status) => {
        console.log("Subscription: ", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1e1f24] text-white py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">SupaTask</h2>

        {/* ➕ Add Task Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#2b2c31] p-5 rounded-xl shadow-md border border-gray-700 mb-8"
        >
          <input
            type="text"
            placeholder="Task Title"
            value={newTask.title}
            onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
            className="w-full mb-3 bg-[#1e1f24] border border-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />

          <textarea
            placeholder="Task Description"
            value={newTask.description}
            onChange={(e) => setNewTask((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full mb-3 bg-[#1e1f24] border border-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            rows={3}
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full text-sm mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 transition text-white py-2 rounded-lg font-semibold"
          >
            ➕ Add Task
          </button>
        </form>

        {/* 📋 Task List */}
        <ul className="space-y-4">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="bg-[#2b2c31] rounded-xl p-4 shadow-md border border-gray-700 hover:border-blue-500 transition"
            >
              <div>
                <h3 className="text-lg font-semibold mb-1">{task.title}</h3>
                <p className="text-gray-400">{task.description}</p>
              </div>

              {task.image_url && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-700 bg-[#1e1f24] flex justify-center">
                  <img
                    src={task.image_url}
                    alt={task.title}
                    className="max-h-60 w-auto object-contain rounded-lg"
                  />
                </div>
              )}

              <div className="mt-4 space-y-2">
                <textarea
                  placeholder="Update description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#1e1f24] border border-gray-700 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => updateTask(task.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 rounded-lg transition"
                  >
                    <div className="flex items-center justify-center p-2">
                    <Pencil/> Edit
                  </div>
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1 rounded-lg transition"
                  >
                    <div className="flex items-center justify-center p-2">
                    <Trash2Icon/>  Delete
                  </div>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default TaskManager;
