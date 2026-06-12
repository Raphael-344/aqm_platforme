/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/react', '@loaders.gl/core'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl',
    };
    return config;
  },
};

module.exports = nextConfig;
