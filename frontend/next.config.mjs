/* eslint-disable */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    outputFileTracingRoot: __dirname,
    turbopack: {
        root: __dirname,
    },
};

export default nextConfig;
