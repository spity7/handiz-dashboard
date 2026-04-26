import { Button, Card, Col, FormLabel, FormText, Row } from 'react-bootstrap'
import Dropzone from 'react-dropzone'
import useFileUploader from '@/hooks/useFileUploader'
import IconifyIcon from '../wrappers/IconifyIcon'
import { useEffect } from 'react'

const DropzoneFormInput = ({ label, labelClassName, helpText, iconProps, showPreview, text, textClassName, onFileUpload, resetTrigger }) => {
  const { selectedFiles, handleAcceptedFiles, removeFile } = useFileUploader(showPreview)

  // 🧹 Whenever resetTrigger changes, clear selected files
  useEffect(() => {
    if (resetTrigger) {
      handleAcceptedFiles([], onFileUpload) // clear both local + parent files
    }
  }, [resetTrigger])

  return (
    <>
      {label && <FormLabel className={labelClassName}>{label}</FormLabel>}

      <Dropzone onDrop={(acceptedFiles) => handleAcceptedFiles(acceptedFiles, onFileUpload)} maxFiles={30}>
        {({ getRootProps, getInputProps }) => (
          <div className="dropzone dropzone-custom w-100">
            <div className="dz-message" {...getRootProps()}>
              <input {...getInputProps()} />
              <IconifyIcon icon={iconProps?.icon ?? 'bx:cloud-upload'} {...iconProps} />
              <h3 className={textClassName}>{text}</h3>
              {helpText && typeof helpText === 'string' ? <FormText>{helpText}</FormText> : helpText}
            </div>
            {showPreview && selectedFiles.length > 0 && (
              <Row className="dz-preview g-3 g-md-4 w-100 mx-0 mt-2">
                {(selectedFiles || []).map((file) => (
                  <Col xs={12} key={`${file.name}-${file.size}-${file.lastModified ?? ''}`}>
                    <Card className="p-2 mb-0 shadow-none border position-relative w-100">
                      {file.preview ? (
                        <img
                          alt={file.name ?? ''}
                          src={file.preview}
                          className="rounded bg-light d-block w-100"
                          style={{ maxWidth: '100%', height: 180, objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded bg-light text-center flex-centered fs-1 w-100"
                          style={{
                            height: 180,
                            minHeight: 120,
                          }}>
                          {file.name?.split('.').pop()?.toUpperCase()}
                        </div>
                      )}
                      <div className="mt-2 w-100" style={{ minWidth: 0 }}>
                        <p role="button" className="text-body-secondary fw-bold small mb-1 text-break" style={{ overflowWrap: 'anywhere' }}>
                          {file.name ?? file.path}
                        </p>
                        <p className="mb-0 small text-break text-muted">{file.formattedSize}</p>
                      </div>
                      {removeFile && (
                        <div className="position-absolute top-0 end-0 p-1">
                          <Button
                            variant="danger"
                            className="rounded-circle icon-sm p-0 d-flex align-items-center justify-content-center"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(file)
                            }}>
                            <IconifyIcon icon="bx:x" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </Dropzone>
    </>
  )
}
export default DropzoneFormInput
