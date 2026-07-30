import { useCallback, useMemo } from 'react'
import InstructorSelect from './InstructorSelect'
import { ROLES } from '@/constants/roles'

const sameId = (a, b) => a != null && b != null && String(a) === String(b)

const getEnrollmentUserId = (enrollment) => enrollment?.userId?._id ?? enrollment?.userId

const isActiveEnrollmentStatus = (status) => status === 'active' || status === 'completed'

const StudentSelect = ({ courseId = '', courseEnrollments = [], value, onChange, ...rest }) => {
  const enrolledUserIdsForCourse = useMemo(() => {
    if (!courseId) return new Set()

    const ids = new Set()
    for (const enrollment of courseEnrollments) {
      if (!isActiveEnrollmentStatus(enrollment.status)) continue
      const userId = getEnrollmentUserId(enrollment)
      if (userId) ids.add(String(userId))
    }
    return ids
  }, [courseId, courseEnrollments])

  const isOptionDisabled = useCallback(
    (user) => {
      if (user?.role === ROLES.ADMIN) return true
      if (courseId && enrolledUserIdsForCourse.has(String(user._id))) return true
      return false
    },
    [courseId, enrolledUserIdsForCourse],
  )

  const getOptionDisabledReason = useCallback(
    (user) => {
      if (user?.role === ROLES.ADMIN) return 'Admin — course access without enrollment'
      if (courseId && enrolledUserIdsForCourse.has(String(user._id))) return 'Already enrolled in this course'
      return null
    },
    [courseId, enrolledUserIdsForCourse],
  )

  return (
    <InstructorSelect
      inputId="enrollment-student-select"
      placeholder="Search by name or email"
      loadingText="Loading users…"
      noOptionsMessage="No users found"
      isOptionDisabled={isOptionDisabled}
      getOptionDisabledReason={getOptionDisabledReason}
      value={value}
      onChange={onChange}
      {...rest}
    />
  )
}

export { getEnrollmentUserId, isActiveEnrollmentStatus, sameId as enrollmentSameId }

export default StudentSelect
