export const THUMBNAIL_ACCEPT = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/avif': ['.avif'],
}

export const THUMBNAIL_ACCEPT_STRING = 'image/jpeg,image/png,image/gif,image/webp,image/avif'

export const THUMBNAIL_INVALID_MESSAGE = 'Thumbnail must be an image file (JPEG, PNG, GIF, WebP, or AVIF).'

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']

export const isImageFile = (file) => {
  if (!file) return false

  const mime = String(file.type || '').toLowerCase()
  if (mime.startsWith('image/')) {
    return (
      mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/png' || mime === 'image/gif' || mime === 'image/webp' || mime === 'image/avif'
    )
  }

  const ext = file.name?.split('.').pop()?.toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext)
}

export const filterImageFiles = (files = []) => files.filter(isImageFile)

export const readThumbnailInput = (event, { onValid, onClear, onInvalid }) => {
  const input = event.target
  const file = input.files?.[0]

  if (!file) {
    onClear?.()
    return
  }

  if (!isImageFile(file)) {
    input.value = ''
    onInvalid?.(THUMBNAIL_INVALID_MESSAGE)
    onClear?.()
    return
  }

  onValid?.(file)
}
