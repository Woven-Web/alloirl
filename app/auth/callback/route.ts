import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Check if user has requested name
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles')
        .select('name_requested')
        .eq('id', user?.id)
        .single()

      // Redirect to name page if name not yet requested
      if (!profile?.name_requested) {
        return NextResponse.redirect(new URL('/username', requestUrl.origin))
      }
    }
  }

  // Redirect to home page
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}