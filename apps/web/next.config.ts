import { loadEnvConfig } from "@next/env"
import path from "path"
import { fileURLToPath } from "url"
import type { NextConfig } from "next"

const monorepoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
)

loadEnvConfig(monorepoRoot)

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
}

export default nextConfig
