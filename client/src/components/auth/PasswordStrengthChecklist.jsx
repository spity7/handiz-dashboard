import IconifyIcon from '@/components/wrappers/IconifyIcon'

const criteriaLabels = {
  length: 'At least 8 characters',
  upperCase: 'One uppercase letter',
  lowerCase: 'One lowercase letter',
  number: 'One number',
  specialChar: 'One special character',
}

const PasswordStrengthChecklist = ({ criteria, visible }) => {
  if (!visible) return null

  const metCount = Object.values(criteria).filter(Boolean).length
  const total = Object.keys(criteria).length
  const strengthPercent = (metCount / total) * 100

  let strengthLabel = 'Weak'
  let strengthClass = 'is-weak'

  if (metCount === total) {
    strengthLabel = 'Strong'
    strengthClass = 'is-strong'
  } else if (metCount >= 3) {
    strengthLabel = 'Fair'
    strengthClass = 'is-fair'
  }

  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength__header">
        <span className="password-strength__label">Password strength</span>
        <span className={`password-strength__value ${strengthClass}`}>{strengthLabel}</span>
      </div>
      <div className="password-strength__bar" role="progressbar" aria-valuenow={strengthPercent} aria-valuemin={0} aria-valuemax={100}>
        <span className={`password-strength__fill ${strengthClass}`} style={{ width: `${strengthPercent}%` }} />
      </div>
      <ul className="password-strength__list">
        {Object.entries(criteriaLabels).map(([key, label]) => {
          const met = criteria[key]
          return (
            <li key={key} className={met ? 'is-met' : ''}>
              <IconifyIcon icon={met ? 'bi:check-circle-fill' : 'bi:circle'} className="password-strength__icon" />
              <span>{label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default PasswordStrengthChecklist
