import { useCallback, useEffect, useMemo, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import clsx from 'clsx'
import ReactSelect from 'react-select'
import UserRoleAvatar from '@/components/users/UserRoleAvatar'
import { ROLES } from '@/constants/roles'
import { useGlobalContext } from '@/context/useGlobalContext'

const ROLE_ORDER = [ROLES.ADMIN, ROLES.EDITOR, ROLES.USER]

const sameId = (a, b) => a != null && b != null && String(a) === String(b)

const getUserDisplayName = (user) => [user?.firstname, user?.lastname].filter(Boolean).join(' ') || user?.username || user?.email || 'Unknown user'

const normalizeUser = (user) => {
  if (!user) return null
  if (typeof user === 'object') return user
  return { _id: user }
}

const InstructorOption = ({ user }) => (
  <div className="instructor-select-option">
    <UserRoleAvatar user={user} size="sm" />
    <div className="instructor-select-option__content">
      <div className="instructor-select-option__name">{getUserDisplayName(user)}</div>
      <div className="instructor-select-option__meta">
        {user.email}
        {user.deletedAt ? ' · Deleted account' : ''}
      </div>
    </div>
  </div>
)

const buildGroupedOptions = (employees, selectedUser) => {
  const employeeMap = new Map(employees.map((employee) => [String(employee._id), employee]))
  const selectedId = selectedUser?._id ? String(selectedUser._id) : null

  if (selectedId && !employeeMap.has(selectedId) && selectedUser?.firstname) {
    employeeMap.set(selectedId, selectedUser)
  }

  const allUsers = Array.from(employeeMap.values()).sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)))

  return ROLE_ORDER.map((role) => ({
    label: role,
    options: allUsers
      .filter((user) => user.role === role)
      .map((user) => ({
        value: String(user._id),
        label: getUserDisplayName(user),
        user,
      })),
  })).filter((group) => group.options.length > 0)
}

const instructorSelectStyles = {
  option: (base, { isFocused, isSelected }) => {
    let backgroundColor = 'transparent'

    if (isSelected && isFocused) {
      backgroundColor = 'var(--bs-primary-bg-subtle)'
    } else if (isFocused) {
      backgroundColor = 'var(--bs-tertiary-bg)'
    } else if (isSelected) {
      backgroundColor = 'color-mix(in srgb, var(--bs-primary) 14%, transparent)'
    }

    return {
      ...base,
      backgroundColor,
      color: 'var(--bs-body-color)',
      cursor: 'pointer',
      ':active': {
        ...base[':active'],
        backgroundColor: 'var(--bs-primary-bg-subtle)',
      },
    }
  },
}

const InstructorSelect = ({
  value,
  onChange,
  selectedUser = null,
  disabled = false,
  inputId = 'course-instructor-select',
  placeholder = 'Select an instructor',
  loadingText = 'Loading instructors…',
  noOptionsMessage = 'No instructors found',
}) => {
  const { getEmployees } = useGlobalContext()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEmployees({ limit: 500 })
      setEmployees((data.employees || []).filter((employee) => !employee.deletedAt))
    } catch (error) {
      console.error('Failed to load instructors', error)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [getEmployees])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const normalizedSelectedUser = useMemo(() => normalizeUser(selectedUser), [selectedUser])

  const groupedOptions = useMemo(() => buildGroupedOptions(employees, normalizedSelectedUser), [employees, normalizedSelectedUser])

  const flatOptions = useMemo(() => groupedOptions.flatMap((group) => group.options), [groupedOptions])

  const selectedOption = useMemo(() => {
    if (!value) return null
    return flatOptions.find((option) => sameId(option.value, value)) || null
  }, [flatOptions, value])

  const formatGroupLabel = (group) => <span className="instructor-select-group-label">{group.label}</span>

  const formatOptionLabel = (option) => <InstructorOption user={option.user} />

  return (
    <div className="instructor-select">
      {loading ? (
        <div className="instructor-select__loading">
          <Spinner animation="border" size="sm" />
          <span>{loadingText}</span>
        </div>
      ) : (
        <ReactSelect
          inputId={inputId}
          classNamePrefix="react-select"
          classNames={{
            option: ({ isFocused, isSelected }) =>
              clsx(isFocused && 'instructor-select__option--focused', isSelected && 'instructor-select__option--selected'),
          }}
          styles={instructorSelectStyles}
          options={groupedOptions}
          value={selectedOption}
          onChange={(option) => onChange(option?.value || '')}
          formatGroupLabel={formatGroupLabel}
          formatOptionLabel={formatOptionLabel}
          isSearchable
          isDisabled={disabled || flatOptions.length === 0}
          placeholder={placeholder}
          noOptionsMessage={() => noOptionsMessage}
          filterOption={(option, inputValue) => {
            const query = inputValue.trim().toLowerCase()
            if (!query) return true
            const user = option.data.user
            return [getUserDisplayName(user), user.email, user.username, user.role]
              .filter(Boolean)
              .some((field) => String(field).toLowerCase().includes(query))
          }}
        />
      )}
    </div>
  )
}

export default InstructorSelect
