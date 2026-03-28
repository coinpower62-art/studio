import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CoinPower Digital Mining',
    short_name: 'CoinPower',
    description: 'Mining energy on the go',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#D4AF37',
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
