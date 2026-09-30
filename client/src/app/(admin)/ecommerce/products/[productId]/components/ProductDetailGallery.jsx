import clsx from 'clsx'
import { useMemo, useState } from 'react'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const buildImageList = (product) => {
  const urls = []
  if (product?.thumbnailUrl) urls.push(product.thumbnailUrl)
  for (const url of product?.gallery || []) {
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls
}

const ProductDetailGallery = ({ product }) => {
  const images = useMemo(() => buildImageList(product), [product])
  const [activeIndex, setActiveIndex] = useState(0)
  const activeUrl = images[activeIndex]

  if (!images.length) {
    return (
      <div className="shop-product-detail__gallery-empty">
        <IconifyIcon icon="bx:image" className="text-muted fs-1" aria-hidden />
        <p className="text-muted mb-0 mt-2">No images uploaded</p>
      </div>
    )
  }

  return (
    <div className="shop-product-detail__gallery">
      <div className="shop-product-detail__gallery-main">
        <img src={activeUrl} alt={product.title} className="shop-product-detail__gallery-main-img" />
      </div>
      {images.length > 1 && (
        <div className="shop-product-detail__gallery-thumbs" role="list">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              role="listitem"
              className={clsx('shop-product-detail__gallery-thumb', activeIndex === index && 'is-active')}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={activeIndex === index ? 'true' : undefined}>
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProductDetailGallery
