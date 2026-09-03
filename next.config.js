/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['handsontable', 'exceljs'],
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.100.50'],
};

export default nextConfig;
