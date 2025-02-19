'use client';

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Suspense, useEffect, useState } from "react";
import { updateProfileName } from "@/app/actions";
import { useSearchParams } from "next/navigation";

function StatusMessage() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const messageType = searchParams.get('type');

  if (!message) return null;

  return (
    <div className={`p-4 rounded-lg ${
      messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`}>
      {message}
    </div>
  );
}

function ProfileForm() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="p-4">Please sign in to edit your profile</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-brand-blue">Email</Label>
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
          className="bg-gray-50"
        />
      </div>

      <form 
        action={async (formData: FormData) => {
          const result = await updateProfileName(formData);
          if ('refresh' in result) {
            window.location.href = result.url;
          }
        }} 
        className="space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="name" className="text-brand-blue">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            defaultValue={profile?.name || ''}
            required
            className="border-brand-blue"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-brand-blue text-white hover:bg-brand-blue/90"
        >
          Save Changes
        </Button>
      </form>
    </div>
  );
}

export default function EditProfilePage() {
  return (
    <div className="p-4 max-w-xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-brand-blue">Edit Profile</h1>
      <Suspense>
        <StatusMessage />
      </Suspense>
      <ProfileForm />
    </div>
  );
}
