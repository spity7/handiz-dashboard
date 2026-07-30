export const PROJECT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
export const PROJECT_MAX_FILE_SIZE_LABEL = '50 MB'
export const PROJECT_MAX_GALLERY_FILES = 30
export const PROJECT_MAX_BLOCK_IMAGES = 50
export const PROJECT_MAX_TOTAL_FILES = 1 + PROJECT_MAX_GALLERY_FILES + PROJECT_MAX_BLOCK_IMAGES

export const PROJECT_IMAGE_UPLOAD_HELP_TEXT = `JPEG, PNG, GIF, WebP, or AVIF. Max ${PROJECT_MAX_FILE_SIZE_LABEL} per image.`

export const validateProjectUploadFiles = ({ thumbnail = null, gallery = [], blockImages = [] } = {}) => {
  const errors = []
  const files = []

  if (thumbnail) files.push({ file: thumbnail, label: 'Thumbnail' })
  gallery.forEach((file, index) => files.push({ file, label: `Gallery image ${index + 1}` }))
  blockImages.forEach((file, index) => files.push({ file, label: `Content block image ${index + 1}` }))

  if (files.length > PROJECT_MAX_TOTAL_FILES) {
    errors.push(`Too many images selected (${files.length}). Maximum ${PROJECT_MAX_TOTAL_FILES} per save.`)
  }

  if (gallery.length > PROJECT_MAX_GALLERY_FILES) {
    errors.push(`Gallery can include at most ${PROJECT_MAX_GALLERY_FILES} new images per save.`)
  }

  if (blockImages.length > PROJECT_MAX_BLOCK_IMAGES) {
    errors.push(`Content blocks can include at most ${PROJECT_MAX_BLOCK_IMAGES} new images per save.`)
  }

  files.forEach(({ file, label }) => {
    if (file.size > PROJECT_MAX_FILE_SIZE_BYTES) {
      errors.push(`${label} "${file.name}" is too large. Maximum size is ${PROJECT_MAX_FILE_SIZE_LABEL}.`)
    }
  })

  return errors
}

export const formatProjectUploadErrors = (errors = []) => errors.join('\n')
