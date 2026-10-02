export type ValidationPath = readonly (string | number)[]

export type ValidationCode =
  | 'missing_field' | 'invalid_type' | 'invalid_value'
  | 'invalid_date' | 'invalid_instant'
  | 'duplicate_id' | 'unknown_source' | 'unknown_provenance'
  | 'unknown_reference' | 'invalid_relationship' | 'cyclic_graph'

export interface ValidationError {
  path: ValidationPath
  code: ValidationCode
  message: string
}

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; errors: ValidationError[] }

export type Validator<T> = (input: unknown) => ValidationResult<T>

export function success<T>(value: T): ValidationResult<T> {
  return { valid: true, value }
}

export function failure(code: ValidationCode, message: string): ValidationResult<never> {
  return { valid: false, errors: [{ path: [], code, message }] }
}

export function validateString(input: unknown): ValidationResult<string> {
  if (input === undefined) return failure('missing_field', 'Required field is missing.')
  return typeof input === 'string'
    ? success(input)
    : failure('invalid_type', 'Expected a string.')
}

export function nullable<T>(validator: Validator<T>): Validator<T | null> {
  return input => input === null ? success(null) : validator(input)
}

export function enumeration<const T extends readonly string[]>(values: T): Validator<T[number]> {
  return input => {
    if (input === undefined) return failure('missing_field', 'Required field is missing.')
    if (typeof input !== 'string') return failure('invalid_type', 'Expected a string enum value.')
    return values.includes(input)
      ? success(input as T[number])
      : failure('invalid_value', 'Value is outside the supported vocabulary.')
  }
}

// Only declared fields are returned; errors never include raw input values.
export function object<T extends object>(
  input: unknown,
  fields: { [K in keyof T]: Validator<T[K]> },
): ValidationResult<T> {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    return failure('invalid_type', 'Expected a record object.')
  }
  const record = input as Record<string, unknown>
  const value: Partial<T> = {}
  const errors: ValidationError[] = []
  for (const key of Object.keys(fields) as (keyof T & string)[]) {
    const result = fields[key](Object.hasOwn(record, key) ? record[key] : undefined)
    if (result.valid) value[key] = result.value
    else errors.push(...result.errors.map(error => ({ ...error, path: [key, ...error.path] })))
  }
  // Every key has passed its validator before this assertion.
  return errors.length ? { valid: false, errors } : success(value as T)
}
