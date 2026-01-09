import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    server: {
        proxy: {
            '/api/kling': {
                target: 'https://api-beijing.klingai.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/kling/, ''),
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.removeHeader('origin');
                        proxyReq.removeHeader('referer');
                    });
                }
            },
            '/api/minimax': {
                target: 'https://api.minimaxi.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/minimax/, '')
            },
            '/api/liblib': {
                target: 'https://openapi.liblibai.cloud',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/liblib/, ''),
                configure: (proxy, options) => {
                    proxy.on('proxyReq', (proxyReq, req, res) => {
                        proxyReq.removeHeader('origin');
                        proxyReq.removeHeader('referer');
                    });
                }
            },
            '/api/bmob': {
                target: 'https://api.bmobcloud.com',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/bmob/, '')
            },
            '/api/bmob-cdn': {
                target: 'http://bmob-cdn-24.b0.upaiyun.com',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/bmob-cdn/, '')
            }
        }
    }
})
