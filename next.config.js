/** @type {import('next').NextConfig} */
// Force Restart Triggered by Agent
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '500mb',
        },
        // Fix for "Request body exceeded 10MB" in Route Handlers
        proxyClientMaxBodySize: '500mb',
    },
};

module.exports = nextConfig;
