'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export function LoggedInCallout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    
    checkAuth();
  }, []);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="relative mb-8 p-4 bg-gradient-to-r from-brand-blue/10 to-brand-yellow/10 rounded-xl border-2 border-brand-blue/20 overflow-hidden">
      <div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        style={{ animation: 'sheen 3s ease-in-out infinite' }}
      />
      <Link 
        href="/events/a6dbab6b-a108-4147-ab09-0cdf0d802edb"
        className="relative font-eyebrow text-lg text-brand-blue hover:opacity-80 transition-opacity"
      >
        👉 Click here to see Cosmo.Local projects
      </Link>
    </div>
  );
}

// Add this to your globals.css file
const styles = `
@keyframes sheen {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}
`; 