import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Study Assistant',
    short_name: 'Study',
    description: 'AI-powered family study mastery platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617', // slate-950
    theme_color: '#4f46e5',      // indigo-600

  }
}
