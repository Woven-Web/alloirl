import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
})({
  /* config options here */
  reactStrictMode: true,
});

export default nextConfig;
