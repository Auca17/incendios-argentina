// Static export. Set NEXT_PUBLIC_BASE_PATH (e.g. "/repo") when hosting under a sub-path.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Pin the workspace root: other lockfiles above this folder otherwise trigger a warning.
  turbopack: { root: import.meta.dirname },
  images: { unoptimized: true },
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
