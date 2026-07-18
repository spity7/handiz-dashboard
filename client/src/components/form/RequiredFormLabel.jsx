import clsx from 'clsx'
import { Form } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const RequiredFormLabel = ({ htmlFor, children, required = false, className }) => (
  <Form.Label htmlFor={htmlFor} className={clsx(required && 'd-inline-flex align-items-center gap-1', className)}>
    {children}
    {required ? <IconifyIcon icon="mdi:asterisk" className="form-label-required-icon" title="Required" aria-hidden="true" /> : null}
  </Form.Label>
)

export default RequiredFormLabel
