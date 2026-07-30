import { THUMBNAIL_INVALID_MESSAGE, isImageFile } from '@/utils/imageFile'

export const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const AVATAR_MAX_FILE_SIZE_LABEL = '5 MB'

export const AVATAR_UPLOAD_HELP_TEXT = `JPEG, PNG, GIF, WebP, or AVIF. Max ${AVATAR_MAX_FILE_SIZE_LABEL}.`

export const validateAvatarUploadFile = (file) => {
  if (!file) return []

  const errors = []
  if (!isImageFile(file)) {
    errors.push(THUMBNAIL_INVALID_MESSAGE)
  }
  if (file.size > AVATAR_MAX_FILE_SIZE_BYTES) {
    errors.push(`Profile photo "${file.name}" is too large. Maximum size is ${AVATAR_MAX_FILE_SIZE_LABEL}.`)
  }
  return errors
}
