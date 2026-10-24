/**
 * Build an optimized Cloudinary URL for food images.
 * Falls back gracefully to the raw URL if it's not a Cloudinary link.
 */
export function cloudinaryUrl(
  rawUrl: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'auto' | 'webp' | 'avif'
    crop?: 'fill' | 'fit' | 'thumb'
    gravity?: 'auto' | 'face' | 'center'
  } = {}
): string {
  if (!rawUrl) return ''

  // Only transform Cloudinary URLs
  if (!rawUrl.includes('res.cloudinary.com')) return rawUrl

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
  } = options

  const transforms: string[] = []

  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  transforms.push(`c_${crop}`)
  transforms.push(`g_${gravity}`)
  transforms.push(`q_${quality}`)
  transforms.push(`f_${format}`)
  transforms.push('dpr_auto')

  const transformStr = transforms.join(',')

  // Insert transformations before /upload/
  return rawUrl.replace('/upload/', `/upload/${transformStr}/`)
}

/**
 * Upload a file to Cloudinary via unsigned preset.
 * The actual upload happens server-side via Supabase Edge Function.
 * This client helper converts the File to base64 for the function.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
