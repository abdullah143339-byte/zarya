import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Keep CSP in sync with whichever backend the build points at.
const defaultBackendDomain = "https://zarya.zarya.blitz.cloud";
let backendDomain = defaultBackendDomain;
try {
  if (process.env.NEXT_PUBLIC_API_URL) {
    backendDomain = new URL(process.env.NEXT_PUBLIC_API_URL).origin;
  }
} catch {
  backendDomain = defaultBackendDomain;
}
const backendWsDomain = backendDomain
  .replace(/^https:\/\//, "wss://")
  .replace(/^http:\/\//, "ws://");

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com https://apis.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  `media-src 'self' blob: http://localhost:8080 ${backendDomain}`,
  `connect-src 'self' http://localhost:8080 http://localhost:3000 ${backendDomain} ${backendWsDomain} https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com ws: wss:`,
  "frame-src 'self' https://accounts.google.com https://apis.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
  isDev ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
