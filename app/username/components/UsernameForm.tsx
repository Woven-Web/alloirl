"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";
import { updateUsername } from "@/app/actions";

export default function UsernameForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not found");
      
      // Get the last 8 characters of the UUID and set it in the input
      const generatedName = user.id.slice(-8);
      setName(generatedName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
        disabled={loading}
        className="w-full h-[60px] bg-transparent border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-blue text-center placeholder:text-brand-blue mb-8"
      />

      {error && (
        <div className="text-center font-eyebrow text-sm text-red-500">
          <FormMessage message={{ message: error }} />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-[60px] bg-brand-blue hover:bg-brand-blue/90 border-2 border-brand-blue rounded-[10px] font-eyebrow text-lg text-brand-yellow"
      >
        {loading ? "Saving..." : "Save Name"}
      </button>
      <button
        type="button"
        onClick={handleUseGeneratedName}
        disabled={loading}
        className="w-full h-[60px] border-2 border-brand-blue/30 rounded-[10px] font-eyebrow text-lg text-brand-blue text-center flex items-center justify-center hover:bg-brand-blue/5 transition-colors"
      >
        Use Generated Name
      </button>
    </form>
  );
}
