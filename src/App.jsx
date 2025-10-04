import React, { useEffect, useState } from "react";
import TaskManager from "./components/task-manager";
import { Auth } from "./components/auth";
import { supabase } from "./supabase-client";

const App = () => {
  const [session, setSession] = useState(null);

  const fetchSession = async () => {
    const currentSession = await supabase.auth.getSession();
    console.log(currentSession);
    setSession(currentSession.data.session);
  };

  useEffect(() => {
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center px-4">
      {session ? (
        <div className="w-full max-w-3xl mt-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">SupaTask</h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
          <TaskManager session={session} />
        </div>
      ) : (
        <div className="w-full max-w-md">
          <Auth />
        </div>
      )}
    </div>
  );
};

export default App;
