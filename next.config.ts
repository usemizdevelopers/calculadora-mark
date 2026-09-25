import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone para rodar em contêiner (Easypanel, Docker).
  output: "standalone",
};

export default nextConfig;
