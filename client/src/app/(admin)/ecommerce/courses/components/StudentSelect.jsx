import InstructorSelect from './InstructorSelect'

const StudentSelect = (props) => (
  <InstructorSelect
    inputId="enrollment-student-select"
    placeholder="Search by name or email"
    loadingText="Loading users…"
    noOptionsMessage="No users found"
    {...props}
  />
)

export default StudentSelect
