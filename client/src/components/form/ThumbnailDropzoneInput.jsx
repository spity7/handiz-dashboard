import Swal from 'sweetalert2'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import { THUMBNAIL_ACCEPT, THUMBNAIL_INVALID_MESSAGE, isImageFile } from '@/utils/imageFile'
import { PROJECT_IMAGE_UPLOAD_HELP_TEXT } from '@/utils/projectUploadLimits'

const ThumbnailDropzoneInput = ({ onFileUpload, helpText, ...props }) => {
  const handleUpload = (files) => {
    if (!files?.length) {
      onFileUpload?.([])
      return
    }

    if (files.length > 1) {
      Swal.fire('Validation', 'Only one thumbnail image is allowed.', 'warning')
      onFileUpload?.(files.slice(0, 1))
      return
    }

    const invalid = files.find((file) => !isImageFile(file))
    if (invalid) {
      Swal.fire('Validation', THUMBNAIL_INVALID_MESSAGE, 'warning')
      return
    }

    onFileUpload?.(files.slice(0, 1))
  }

  const handleRejected = () => {
    Swal.fire('Validation', THUMBNAIL_INVALID_MESSAGE, 'warning')
  }

  return (
    <DropzoneFormInput
      {...props}
      accept={THUMBNAIL_ACCEPT}
      maxFiles={1}
      helpText={helpText ?? PROJECT_IMAGE_UPLOAD_HELP_TEXT}
      onFileUpload={handleUpload}
      onDropRejected={handleRejected}
    />
  )
}

export default ThumbnailDropzoneInput
