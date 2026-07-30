import { useCallback, useEffect, useMemo, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import clsx from 'clsx'
import ReactSelect, { createFilter } from 'react-select'
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

const InstructorOption = ({ user, disabledReason = null, isDisabled = false }) => (
  <div className={clsx('instructor-select-option', isDisabled && 'instructor-select-option--disabled')}>
    <UserRoleAvatar user={user} size="sm" />
    <div className="instructor-select-option__content">
      <div className="instructor-select-option__name">{getUserDisplayName(user)}</div>
      <div className="instructor-select-option__meta">
        {disabledReason || (
          <>
            {user.email}
            {user.deletedAt ? ' · Deleted account' : ''}
          </>
        )}
      </div>
    </div>
  </div>
)

const buildGroupedOptions = (employees, selectedUser, { isOptionDisabled, getOptionDisabledReason } = {}) => {
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
      .map((user) => {
        const isDisabled = isOptionDisabled?.(user) ?? false
        const disabledReason = isDisabled ? getOptionDisabledReason?.(user) || 'Unavailable' : null

        return {
          value: String(user._id),
          label: getUserDisplayName(user),
          user,
          isDisabled,
          disabledReason,
        }
      }),
  })).filter((group) => group.options.length > 0)
}

const userOptionSearchText = (option) => {
  const user = option?.user
  if (!user) return option?.label || ''
  return [getUserDisplayName(user), user.email, user.username, user.role].filter(Boolean).join(' ')
}

export const instructorSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bs-body-bg)',
    borderColor: state.isFocused ? 'var(--bs-primary)' : 'var(--bs-border-color)',
    boxShadow: state.isFocused ? '0 0 0 0.2rem color-mix(in srgb, var(--bs-primary) 25%, transparent)' : 'none',
    color: 'var(--bs-body-color)',
    cursor: 'pointer',
    ':hover': {
      borderColor: state.isFocused ? 'var(--bs-primary)' : 'var(--bs-border-color)',
    },
  }),
  valueContainer: (base) => ({
    ...base,
    color: 'var(--bs-body-color)',
  }),
  input: (base) => ({
    ...base,
    color: 'var(--bs-body-color)',
    margin: 0,
    padding: 0,
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--bs-body-color)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--bs-secondary-color)',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--bs-secondary-color)',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'var(--bs-border-color)',
  }),
  option: (base, { isFocused, isSelected, isDisabled }) => {
    let backgroundColor = 'transparent'

    if (!isDisabled) {
      if (isSelected && isFocused) {
        backgroundColor = 'var(--bs-primary-bg-subtle)'
      } else if (isFocused) {
        backgroundColor = 'var(--bs-tertiary-bg)'
      } else if (isSelected) {
        backgroundColor = 'color-mix(in srgb, var(--bs-primary) 14%, transparent)'
      }
    }

    return {
      ...base,
      backgroundColor,
      color: isDisabled ? 'var(--bs-secondary-color)' : 'var(--bs-body-color)',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      opacity: isDisabled ? 0.65 : 1,
      ':active': isDisabled
        ? {}
        : {
            ...base[':active'],
            backgroundColor: 'var(--bs-primary-bg-subtle)',
          },
    }
  },
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
}

const userSearchFilter = createFilter({
  matchFrom: 'any',
  stringify: userOptionSearchText,
})

const InstructorSelect = ({
  value,
  onChange,
  selectedUser = null,
  disabled = false,
  inputId = 'course-instructor-select',
  placeholder = 'Select an instructor',
  loadingText = 'Loading instructors…',
  noOptionsMessage = 'No instructors found',
  isOptionDisabled = null,
  getOptionDisabledReason = null,
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

  const groupedOptions = useMemo(
    () => buildGroupedOptions(employees, normalizedSelectedUser, { isOptionDisabled, getOptionDisabledReason }),
    [employees, normalizedSelectedUser, isOptionDisabled, getOptionDisabledReason],
  )

  const flatOptions = useMemo(() => groupedOptions.flatMap((group) => group.options), [groupedOptions])

  const selectedOption = useMemo(() => {
    if (!value) return null
    return flatOptions.find((option) => sameId(option.value, value)) || null
  }, [flatOptions, value])

  const formatGroupLabel = (group) => <span className="instructor-select-group-label">{group.label}</span>

  const formatOptionLabel = (option) => <InstructorOption user={option.user} disabledReason={option.disabledReason} isDisabled={option.isDisabled} />

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
            option: ({ isFocused, isSelected, isDisabled }) =>
              clsx(
                isFocused && !isDisabled && 'instructor-select__option--focused',
                isSelected && !isDisabled && 'instructor-select__option--selected',
                isDisabled && 'instructor-select__option--disabled',
              ),
          }}
          styles={instructorSelectStyles}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          options={groupedOptions}
          value={selectedOption}
          onChange={(option) => onChange(option?.value || '')}
          formatGroupLabel={formatGroupLabel}
          formatOptionLabel={formatOptionLabel}
          isSearchable
          isDisabled={disabled || flatOptions.length === 0}
          placeholder={placeholder}
          noOptionsMessage={() => noOptionsMessage}
          filterOption={userSearchFilter}
        />
      )}
    </div>
  )
}

export default InstructorSelect
