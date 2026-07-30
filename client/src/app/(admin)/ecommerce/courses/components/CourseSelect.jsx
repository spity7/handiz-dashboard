import { useMemo } from 'react'
import ReactSelect, { createFilter } from 'react-select'
import { instructorSelectStyles } from './InstructorSelect'

const sameId = (a, b) => a != null && b != null && String(a) === String(b)

const courseOptionSearchText = (option) => {
  const course = option?.course
  if (!course) return option?.label || ''
  return [course.title, course.slug].filter(Boolean).join(' ')
}

const courseSearchFilter = createFilter({
  matchFrom: 'any',
  stringify: courseOptionSearchText,
})

const CourseSelect = ({
  courses = [],
  value,
  onChange,
  disabled = false,
  inputId = 'enrollment-course-select',
  placeholder = 'Search by course title',
  noOptionsMessage = 'No courses found',
}) => {
  const options = useMemo(
    () =>
      [...courses]
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        .map((course) => ({
          value: String(course._id),
          label: course.title || 'Untitled course',
          course,
        })),
    [courses],
  )

  const selectedOption = useMemo(() => options.find((option) => sameId(option.value, value)) || null, [options, value])

  return (
    <div className="instructor-select course-select">
      <ReactSelect
        inputId={inputId}
        classNamePrefix="react-select"
        styles={instructorSelectStyles}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        options={options}
        value={selectedOption}
        onChange={(option) => onChange(option?.value || '')}
        isSearchable
        isDisabled={disabled || options.length === 0}
        placeholder={placeholder}
        noOptionsMessage={() => noOptionsMessage}
        filterOption={courseSearchFilter}
      />
    </div>
  )
}

export default CourseSelect
