import path from "node:path";
import os from "node:os";

const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

// Allow specifying extra dev origins via environment to match your LAN IP/port
const extraOrigins = (process.env.DEV_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Auto-detect local LAN IPv4 addresses and build allowed origins for dev
const DEV_PORT = Number(process.env.PORT || 3000);
const lanIPs = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => i.address);

const lanOrigins = lanIPs.map((ip) => `http://${ip}:${DEV_PORT}`);

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  // Allow dev access from LAN clients in Next.js dev mode
  // Add more via DEV_ALLOWED_ORIGINS="http://192.168.1.34:3000,http://your-hostname:3000"
  // Autodetected LAN origins are included via lanOrigins.
  allowedDevOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...lanOrigins,
    ...extraOrigins,
  ],
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  turbopack: {
    rules: {
      "*.{jsx,tsx}": {
        loaders: [LOADER]
      }
    }
  }
};

export default nextConfig;
