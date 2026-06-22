/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backend =
      process.env.GRAPHQL_BACKEND_URL ?? "http://127.0.0.1:8000";
    return [
      {
        source: "/graphql",
        destination: `${backend}/graphql/`,
      },
    ];
  },
};

export default nextConfig;
