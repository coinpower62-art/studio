import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CoinPower Digital Mining',
    short_name: 'CoinPower',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#D4AF37',
    description: 'Mining energy on the go',
    start_url: 'https://coinpower-app.vercel.app/',
    id: 'https://coinpower-app.vercel.app/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable', 
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  }
}
