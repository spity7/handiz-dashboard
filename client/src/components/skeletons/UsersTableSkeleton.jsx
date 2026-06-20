import { Placeholder, Table } from 'react-bootstrap'

const DEFAULT_ROW_COUNT = 8

const UsersTableSkeleton = ({ rowCount = DEFAULT_ROW_COUNT }) => (
  <div className="users-table-skeleton" aria-busy="true" aria-label="Loading users">
    <Table responsive hover className="mb-0 users-table">
      <thead className="bg-light bg-opacity-50">
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Projects</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody className="placeholder-glow">
        {Array.from({ length: rowCount }, (_, index) => (
          <tr key={index}>
            <td>
              <div className="d-flex align-items-center gap-3">
                <Placeholder as="span" animation="glow" className="users-table-skeleton__avatar rounded-circle" />
                <div className="flex-grow-1">
                  <Placeholder xs={6} className="mb-2" />
                  <Placeholder xs={8} size="sm" />
                </div>
              </div>
            </td>
            <td>
              <Placeholder as="span" animation="glow" className="users-table-skeleton__badge rounded-pill" />
            </td>
            <td>
              <Placeholder as="span" animation="glow" className="users-table-skeleton__projects rounded" />
            </td>
            <td>
              <Placeholder as="span" animation="glow" className="users-table-skeleton__action rounded" />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
)

export default UsersTableSkeleton
