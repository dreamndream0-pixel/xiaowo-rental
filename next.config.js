/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    // pdf-parse(pdfjs) 需從 node_modules 載入（含 worker），不要打包進 bundle
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    // 強制把 pdf-parse 完整檔案（含動態載入的 pdfjs worker）打包進該 API 的 serverless function
    outputFileTracingIncludes: {
      '/api/parking/import-report': ['./node_modules/pdf-parse/**/*'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 不要把 pdf-parse/pdfjs 打包進 server bundle，改由 node_modules 於執行期載入
      config.externals = [...(config.externals || []), 'pdf-parse', 'pdfjs-dist']
    }
    return config
  },
}

module.exports = nextConfig
