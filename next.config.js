/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['handsontable', 'exceljs'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
