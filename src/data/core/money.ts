import { enumeration, failure, object, success, validateString } from './validation.ts'
import type { ValidationResult } from './validation.ts'

export interface CurrencyAmount {
  currency: 'candle' | 'heart' | 'other'
  sourceCurrencyLabel: string
  amount: number | null
}

function validateAmount(input: unknown): ValidationResult<number | null> {
  if (input === null) return success(null)
  if (input === undefined) return failure('missing_field', 'Amount must be explicit; use null for unknown.')
  if (typeof input !== 'number') return failure('invalid_type', 'Expected a numeric integer or null; numeric strings are not coerced.')
  return Number.isSafeInteger(input) && input >= 0
    ? success(input)
    : failure('invalid_value', 'Expected a non-negative safe integer or null.')
}

export function validateCurrencyAmount(input: unknown): ValidationResult<CurrencyAmount> {
  const result = object<CurrencyAmount>(input, {
    currency: enumeration(['candle', 'heart', 'other']),
    sourceCurrencyLabel: validateString,
    amount: validateAmount,
  })
  if (result.valid && result.value.currency === 'other' && !result.value.sourceCurrencyLabel.trim()) {
    return { valid: false, errors: [{ path: ['sourceCurrencyLabel'], code: 'invalid_value', message: 'Other currency requires its original source label.' }] }
  }
  return result
}
