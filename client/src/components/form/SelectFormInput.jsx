import { FormLabel } from 'react-bootstrap'
import Feedback from 'react-bootstrap/esm/Feedback'
import { Controller } from 'react-hook-form'
import ReactSelect from 'react-select'

const SelectFormInput = ({ control, id, name, label, className, containerClassName, labelClassName, noValidate, options, ...other }) => {
  // ✅ if control is not provided, act as plain controlled input
  if (!control) {
    return (
      <div className={containerClassName}>
        {label && (
          <FormLabel htmlFor={id ?? name} className={labelClassName}>
            {label}
          </FormLabel>
        )}
        <ReactSelect
          {...other}
          options={options}
          onChange={(e) => other?.onChange?.(e.value)}
          value={options?.find((op) => op.value === other?.value) || null}
          classNamePrefix="react-select"
          id={id ?? name}
        />
      </div>
    )
  }

  // ✅ Normal hook-form-controlled mode
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={containerClassName}>
          {label &&
            (typeof label === 'string' ? (
              <FormLabel htmlFor={id ?? name} className={labelClassName}>
                {label}
              </FormLabel>
            ) : (
              <>{label}</>
            ))}
          {/* @ts-ignore */}
          <ReactSelect
            {...other}
            {...field}
            options={options}
            onChange={(e) => field.onChange(e.value)}
            value={options?.find((op) => op.value === field.value) || null}
            classNamePrefix="react-select"
            id={id ?? name}
          />
          {!noValidate && fieldState.error?.message && <Feedback type="invalid">{fieldState.error?.message}</Feedback>}
        </div>
      )}
    />
  )
}
export default SelectFormInput
