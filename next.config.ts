import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR requests when accessing dev server via 127.0.0.1
  // This is only relevant in development and resolves blocked websocket errors.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
