/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse", "sharp", "tesseract.js", "better-sqlite3", "pg"],
};

export default nextConfig;
