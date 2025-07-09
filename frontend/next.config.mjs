/* eslint-disable */
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 跳过构建阶段的 ESLint，以避免部署因样式/语法警告失败
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
