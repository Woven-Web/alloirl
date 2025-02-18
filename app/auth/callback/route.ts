import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

// Helper function to detect in-app browsers
function isInAppBrowser(userAgent: string) {
  return (
    userAgent.includes('iPhone') && // iOS device
    !userAgent.includes('Safari/')  // Not main Safari
  ) || userAgent.includes('GSA/');  // Gmail specific app
}

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const headersList = await headers();
  const userAgent = headersList.get('user-agent') || '';

  // If this is an in-app browser and we have a code, show warning
  if (code && isInAppBrowser(userAgent)) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Open in Safari</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.5;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
              text-align: center;
            }
            .warning {
              background: #fff3cd;
              border: 1px solid #ffeeba;
              color: #856404;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              background: #007bff;
              color: white;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="warning">
            <h2>⚠️ Please open in Safari</h2>
            <p>For security reasons, please open this link in your main Safari browser instead of the in-app browser.</p>
            <p>Copy this link and paste it into Safari:</p>
            <code>${request.url}</code>
            <br/>
            <a class="button" href="${request.url}">Open in Safari</a>
          </div>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }

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