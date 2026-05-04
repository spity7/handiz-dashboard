import clsx from 'clsx'
import { Card, CardBody, CardTitle } from 'react-bootstrap'

const ComponentContainerCard = ({ title, id, description, children, titleClass, headerAction, bodyClassName }) => {
  return (
    <Card>
      <CardBody className={bodyClassName}>
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-1">
          <CardTitle as={'h5'} className={clsx('anchor mb-0', titleClass)} id={id}>
            {title}
            <a className="anchor-link" href={`#${id}`}>
              #
            </a>
          </CardTitle>
          {headerAction}
        </div>
        {!!description && <p className="text-muted">{description}</p>}
        <>{children}</>
      </CardBody>
    </Card>
  )
}
export default ComponentContainerCard
