/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Automatically Copying Traced Files
  // https://nextjs.org/docs/app/api-reference/next-config-js/output#automatically-copying-traced-files
  // https://dev.to/leduc1901/reduce-docker-image-size-for-your-nextjs-app-5911
  output: "standalone",

  // https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
  experimental: {
    // Enabled instrumentation hook
    instrumentationHook: true,
    // optimizePackageImports: ["@/hooks", "@/components/atoms", "@/components/molecules", "@/components/organisms"],
  },
};

module.exports = nextConfig;
