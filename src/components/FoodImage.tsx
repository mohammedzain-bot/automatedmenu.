import { cloudinaryUrl } from '../lib/cloudinary'
import { useState } from 'react'

const CATEGORY_EMOJI: Record<string, string> = {
  'Main Course': '🍛',
  'Starters': '🥙',
  'Breads': '🫓',
  'Rice & Biryani': '🍚',
  'Desserts': '🍮',
  'Beverages': '🥤',
  'Snacks': '🍟',
  'Soups': '🍜',
}

interface FoodImageProps {
  src: string | null
  alt: string
  className?: string
  width?: number
  height?: number
  category?: string | null
}

export default function FoodImage({ src, alt, className = '', width = 400, height = 300, category }: FoodImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const url = src ? cloudinaryUrl(src, { width, height, format: 'auto', quality: 80 }) : ''

  const emoji = (category && CATEGORY_EMOJI[category]) || '🍽️'

  if (!url || error) {
    return (
      <div className={`bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center gap-1 ${className}`}>
        <span className="text-4xl select-none">{emoji}</span>
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <div className="absolute inset-0 skeleton" />}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  )
}
