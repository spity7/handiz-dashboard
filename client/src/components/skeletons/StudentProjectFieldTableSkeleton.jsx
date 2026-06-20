import { Placeholder, Table } from 'react-bootstrap'

const DEFAULT_ROW_COUNT = 6

const StudentProjectFieldTableSkeleton = ({ rowCount = DEFAULT_ROW_COUNT }) => (
  <div className="table-responsive projects-field-table-skeleton" aria-busy="true" aria-label="Loading items">
    <Table className="mb-0 align-middle" hover>
      <thead className="table-light">
        <tr>
          <th>Name</th>
          <th style={{ width: 120 }}>Type</th>
          <th className="text-end" style={{ width: 200 }}>
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="placeholder-glow">
        {Array.from({ length: rowCount }, (_, index) => (
          <tr key={index}>
            <td>
              <Placeholder
                as="span"
                animation="glow"
                className="projects-field-table-skeleton__name rounded"
                style={{ width: `${45 + (index % 4) * 10}%` }}
              />
            </td>
            <td>
              <Placeholder as="span" animation="glow" className="projects-field-table-skeleton__badge rounded-pill" />
            </td>
            <td className="text-end">
              <div className="d-flex gap-1 justify-content-end">
                <Placeholder as="span" animation="glow" className="projects-field-table-skeleton__action rounded" />
                <Placeholder as="span" animation="glow" className="projects-field-table-skeleton__action rounded" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
)

export default StudentProjectFieldTableSkeleton
