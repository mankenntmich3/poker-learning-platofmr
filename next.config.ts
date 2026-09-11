import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: { optimizePackageImports: ['lucide-react'] },
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  outputFileTracingIncludes: { '/**': ['./data/solutions/**/*', './data/nlhe/**/*', './src/strategy/nlhe-policy.ts', './src/domain/holdem.ts', './src/domain/study.ts', './src/domain/analysis.ts', './src/strategy/sizing-approximation.ts', './src/strategy/study-provider.ts', './migrations/**/*'] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default config;
