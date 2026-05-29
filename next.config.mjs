/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for Docker / Railway: ~node_modules-free image
  // with a single `node server.js` entrypoint.
  output: "standalone",
  // better-sqlite3 is a native module — Next must not try to bundle it.
  serverExternalPackages: ["better-sqlite3"],
  // Encar photos are served from Encar's CDN — allow Next/Image to optimize them.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ci.encar.com" },
      { protocol: "https", hostname: "img.encar.com" },
      { protocol: "https", hostname: "**.encar.com" },
    ],
  },
  // The CLI scripts use NodeNext-style `.js` import suffixes (required for
  // "type": "module"). Tell webpack to resolve those back to `.ts` source.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};
export default nextConfig;
