"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";
import { updateUsername } from "@/app/actions";
import { User } from "@supabase/supabase-js";

export default function UsernameForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    
    const result = await updateUsername(formData);
    
    if ('error' in result) {
      setError(result.error || "An error occurred");
      setLoading(false);
    } else if ('refresh' in result) {
      window.location.href = result.url;
    }
  };

  const handleUseGeneratedName = async () => {
    try {
      if (!user?.id) throw new Error("User not found");
      
      // Get the last 8 characters of the UUID
      const generatedName = user.id.slice(-8);
      
      // Set the name and submit the form
      setLoading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append("name", generatedName);
      
      const result = await updateUsername(formData);
      
      if ('error' in result) {
        setError(result.error || "An error occurred");
        setLoading(false);
      } else if ('refresh' in result) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            disabled={loading}
            className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue/50"
          />
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !name}
          className="w-full h-[60px] bg-brand-blue hover:bg-brand-blue/90 border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-yellow"
        >
          Save Custom Name
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-brand-blue/30" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-brand-blue/50 font-eyebrow">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleUseGeneratedName}
        disabled={loading}
        className="w-full h-[60px] border-2 border-brand-blue/30 rounded-[10px] font-eyebrow text-lg text-brand-blue text-center flex items-center justify-center hover:bg-brand-blue/5 transition-colors"
      >
        Use Generated Name {user && `@${user.id.slice(-8)}`}
      </button>
    </div>
  );
}
