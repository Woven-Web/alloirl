import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="AlloIRL" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AlloIRL" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="initial-scale=1, viewport-fit=cover, width=device-width" />
        
        {/* iOS splash screen images */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-startup-image" href="/splash/launch.png" />

        {/* Universal Links for iOS */}
        <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID,app-argument=https://alloirl.vercel.app" />
        <link rel="alternate" href="android-app://com.alloirl/https/alloirl.vercel.app" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
