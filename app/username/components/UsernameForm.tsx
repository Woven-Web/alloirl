"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/form-message";

export default function UsernameForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Name cannot be empty");
      setLoading(false);
      return;
    }

    // Basic validation
    if (name.length < 2) {
      setError("Name must be at least 2 characters long");
      setLoading(false);
      return;
    }

    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
      setError(
        "Name can only contain letters, numbers, spaces, underscores and dashes"
      );
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: name.trim(),
        })
        .eq("id", (await supabase.auth.getUser()).data.user?.id);

      if (updateError) {
        // Check for unique constraint violation
        if (updateError.code === '23505') {
          throw new Error(`The name "${name}" is already taken. Please choose another.`);
        }
        throw updateError;
      }

      router.push("/?message=Name set successfully!&type=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleUseGeneratedName = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("User not found");
      
      // Get the last 8 characters of the UUID
      const generatedName = user.id.slice(-8);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name: generatedName,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      router.push("/?message=Name set successfully!&type=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
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
