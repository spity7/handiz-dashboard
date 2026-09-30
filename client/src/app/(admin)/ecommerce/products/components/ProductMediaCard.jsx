import clsx from 'clsx'
import { Button, Spinner } from 'react-bootstrap'
import ComponentContainerCard from '@/components/ComponentContainerCard'
import DropzoneFormInput from '@/components/form/DropzoneFormInput'
import ThumbnailDropzoneInput from '@/components/form/ThumbnailDropzoneInput'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { THUMBNAIL_ACCEPT } from '@/utils/imageFile'

// Mirrors the multer limits on POST/PUT /shop/products (server/routes/shopRoutes.js).
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
export const MAX_GALLERY_IMAGES = 20

const DROPZONE_ICON = { icon: 'bx:cloud-upload', height: 32, width: 32 }

const ProductMediaCard = ({
  isEdit,
  thumbnailUrl,
  existingGallery,
  removingUrl,
  disabled,
  thumbnailError,
  onThumbnailChange,
  onGalleryChange,
  onRemoveGalleryImage,
}) => (
  <ComponentContainerCard id="product-media" title="Media" description="Clear, well-lit photos on a plain background sell best.">
    <div className={clsx(disabled && 'pe-none opacity-75')}>
      {isEdit && thumbnailUrl && (
        <div className="mb-3">
          <p className="form-label mb-1">Current thumbnail</p>
          <img src={thumbnailUrl} alt="Current product thumbnail" className="img-fluid rounded border w-100" style={{ maxHeight: 220, objectFit: 'contain' }} />
        </div>
      )}

      <ThumbnailDropzoneInput
        label={isEdit ? 'Replace thumbnail' : 'Thumbnail'}
        labelClassName="fs-14 mb-1"
        required={!isEdit}
        showPreview
        iconProps={DROPZONE_ICON}
        text={isEdit ? 'Drop a new image or click to upload' : 'Drop an image here or click to upload'}
        textClassName="fs-16 mb-1"
        helpText="JPEG, PNG, GIF, WebP or AVIF. Max 20 MB."
        onFileUpload={(files) => onThumbnailChange(files[0] ?? null)}
      />
      {thumbnailError && (
        <p className="text-danger small mt-1 mb-0" role="alert">
          {thumbnailError}
        </p>
      )}

      <hr className="my-3" />

      {isEdit && existingGallery.length > 0 && (
        <div className="mb-3">
          <p className="form-label mb-1">Current gallery ({existingGallery.length})</p>
          <div className="d-flex flex-wrap gap-2 mb-1">
            {existingGallery.map((url) => (
              <div key={url} className="position-relative" style={{ width: 72, height: 72 }}>
                <img src={url} alt="" className="rounded border w-100 h-100" style={{ objectFit: 'cover' }} />
                <Button
                  variant="danger"
                  className="position-absolute top-0 end-0 rounded-circle p-0 d-flex align-items-center justify-content-center"
                  style={{ width: 20, height: 20, transform: 'translate(35%, -35%)' }}
                  aria-label="Remove gallery image"
                  disabled={disabled}
                  onClick={() => onRemoveGalleryImage(url)}>
                  {removingUrl === url ? <Spinner animation="border" style={{ width: 10, height: 10, borderWidth: 2 }} /> : <IconifyIcon icon="bx:x" />}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-muted small mb-0">Removing an image takes effect immediately.</p>
        </div>
      )}

      <DropzoneFormInput
        label={isEdit ? 'Add gallery images' : 'Gallery images (optional)'}
        labelClassName="fs-14 mb-1"
        accept={THUMBNAIL_ACCEPT}
        maxFiles={MAX_GALLERY_IMAGES}
        showPreview
        iconProps={DROPZONE_ICON}
        text="Drop images here or click to upload"
        textClassName="fs-16 mb-1"
        helpText={`Up to ${MAX_GALLERY_IMAGES} images per save, 20 MB each.`}
        onFileUpload={onGalleryChange}
      />
    </div>
  </ComponentContainerCard>
)

export default ProductMediaCard
