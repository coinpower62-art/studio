import { type MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CoinPower',
    short_name: 'CoinPower',
    description: 'Digital Energy Mining Platform',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FCF9F4',
    theme_color: '#b8860b',
    icons: [
      {
        src: 'https://picsum.photos/seed/coinpowerlogo/192/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://picsum.photos/seed/coinpowerlogo/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'https://picsum.photos/seed/coinpowerlogo-maskable/512/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
