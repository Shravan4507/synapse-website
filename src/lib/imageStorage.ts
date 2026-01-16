/**
 * Image Storage Service
 * 
 * Currently stores images as compressed base64 in Firestore.
 * When Firebase Storage is enabled, just update this file to upload to Storage
 * and return the download URL instead.
 */

// Max dimensions for compression
const MAX_WIDTH = 800
const MAX_HEIGHT = 800
const QUALITY = 0.75 // 75% quality for WebP/JPEG compression

/**
 * Check if browser supports WebP
 */
const supportsWebP = (): boolean => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
}

/**
 * Compress an image file and return base64 data URL
 * Later: Upload to Firebase Storage and return download URL
 */
export const uploadImage = async (
    file: File,
    _path: string // Path parameter for future Firebase Storage use
): Promise<{ success: boolean; url?: string; error?: string }> => {
    try {
        // For now: Compress and return base64
        const compressedDataUrl = await compressImage(file)

        // TODO: When Firebase Storage is enabled:
        // 1. Uncomment the code below
        // 2. Comment out the base64 return above
        /*
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        return { success: true, url }
        */

        return { success: true, url: compressedDataUrl }
    } catch (error) {
        console.error('Error uploading image:', error)
        return { success: false, error: 'Failed to process image' }
    }
}

/**
 * Compress image to reduce file size
 * Uses WebP format for best compression (30-50% smaller than JPEG)
 * Falls back to JPEG/PNG for older browsers
 */
export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img

                if (width > MAX_WIDTH) {
                    height = (height * MAX_WIDTH) / width
                    width = MAX_WIDTH
                }

                if (height > MAX_HEIGHT) {
                    width = (width * MAX_HEIGHT) / height
                    height = MAX_HEIGHT
                }

                // Create canvas for compression
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('Could not get canvas context'))
                    return
                }

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height)

                // Check if it's a GIF (don't compress GIFs to preserve animation)
                if (file.type === 'image/gif') {
                    resolve(e.target?.result as string)
                    return
                }

                // Prefer WebP for best compression (30-50% smaller files)
                // Fall back to JPEG/PNG for unsupported browsers
                let outputType: string
                if (supportsWebP()) {
                    outputType = 'image/webp'
                } else if (file.type === 'image/png') {
                    outputType = 'image/png'
                } else {
                    outputType = 'image/jpeg'
                }

                const compressedDataUrl = canvas.toDataURL(outputType, QUALITY)
                resolve(compressedDataUrl)
            }

            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = e.target?.result as string
        }

        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

/**
 * Process multiple image files
 */
export const uploadImages = async (
    files: File[],
    basePath: string
): Promise<{ success: boolean; urls: string[]; errors: string[] }> => {
    const urls: string[] = []
    const errors: string[] = []

    for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `${basePath}/${Date.now()}_${i}_${file.name}`

        const result = await uploadImage(file, path)

        if (result.success && result.url) {
            urls.push(result.url)
        } else {
            errors.push(result.error || `Failed to upload ${file.name}`)
        }
    }

    return {
        success: errors.length === 0,
        urls,
        errors
    }
}

/**
 * Delete an image
 * Currently no-op for base64, will delete from Storage when enabled
 */
export const deleteImage = async (_url: string): Promise<{ success: boolean }> => {
    // TODO: When Firebase Storage is enabled:
    /*
    const imageRef = ref(storage, url)
    await deleteObject(imageRef)
    */
    return { success: true }
}

/**
 * Check if URL is a base64 data URL (vs Storage URL)
 * Useful during migration
 */
export const isBase64Url = (url: string): boolean => {
    return url.startsWith('data:')
}
