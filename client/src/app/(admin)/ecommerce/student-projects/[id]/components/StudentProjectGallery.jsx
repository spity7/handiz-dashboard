import { useState } from 'react'
import { Modal } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const StudentProjectGallery = ({ images = [] }) => {
  const [activeIndex, setActiveIndex] = useState(-1)

  if (!images.length) return null

  const close = () => setActiveIndex(-1)
  const showPrev = () => setActiveIndex((index) => (index > 0 ? index - 1 : images.length - 1))
  const showNext = () => setActiveIndex((index) => (index < images.length - 1 ? index + 1 : 0))

  return (
    <div className="student-project-detail__gallery">
      <h5 className="student-project-detail__section-title">Gallery</h5>
      <div className="row g-3">
        {images.map((imageUrl, index) => (
          <div key={imageUrl + index} className="col-6 col-md-4 col-lg-3">
            <button
              type="button"
              className="student-project-detail__gallery-thumb"
              onClick={() => setActiveIndex(index)}
              aria-label={`Open gallery image ${index + 1}`}>
              <img src={imageUrl} alt={`Gallery ${index + 1}`} />
            </button>
          </div>
        ))}
      </div>

      <Modal show={activeIndex >= 0} onHide={close} centered size="lg" className="student-project-detail__gallery-modal">
        <Modal.Body className="p-0 position-relative">
          {activeIndex >= 0 && (
            <img src={images[activeIndex]} alt={`Gallery ${activeIndex + 1}`} className="student-project-detail__gallery-modal-image" />
          )}
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="student-project-detail__gallery-nav student-project-detail__gallery-nav--prev"
                onClick={showPrev}
                aria-label="Previous image">
                <IconifyIcon icon="bx:chevron-left" />
              </button>
              <button
                type="button"
                className="student-project-detail__gallery-nav student-project-detail__gallery-nav--next"
                onClick={showNext}
                aria-label="Next image">
                <IconifyIcon icon="bx:chevron-right" />
              </button>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default StudentProjectGallery
