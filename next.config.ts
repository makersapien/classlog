import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */ experimental: {
    serverComponentsExternalPackages: ['jsonwebtoken']
  }
};
module.exports = {
  env: {
    NEXT_PUBLIC_BASE_URL: 'https://classlogger.com',
  },
};


export default nextConfig;
