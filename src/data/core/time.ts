import type { DateTime } from './primitives.ts'
import { enumeration, failure, nullable, object, success, validateString } from './validation.ts'
import type { ValidationResult } from './validation.ts'

export interface PartialTime {
  value: string
  precision: 'date' | 'instant' | 'unknown'
  timezone: string | null
  rawLabel: string | null
}

function validDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match || match[0] !== value) return false
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
}

export function validateDateTime(input: unknown): ValidationResult<DateTime> {
  const string = validateString(input)
  if (!string.valid) return string
  const match = /^(\d{4}-\d{2}-\d{2})[Tt](\d{2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?([Zz]|[+-]\d{2}(?::?\d{2})?)$/.exec(string.value)
  if (!match || match[0] !== string.value || !validDate(match[1])) {
    return failure('invalid_instant', 'Expected a valid ISO calendar instant with explicit UTC or numeric offset.')
  }
  const [, , hour, minute, second, offset] = match
  const offsetDigits = offset.slice(1).replace(':', '')
  const offsetHour = Number(offsetDigits.slice(0, 2))
  const offsetMinute = Number(offsetDigits.slice(2) || '0')
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second ?? '0') > 59
    || (offset.toUpperCase() !== 'Z' && (offsetHour > 23 || offsetMinute > 59))) {
    return failure('invalid_instant', 'Clock or offset components are outside their valid range.')
  }
  return success(string.value)
}

// Retain arbitrary fraction precision and every accepted offset spelling.
// Invalid inputs throw so ordering checks cannot silently compare NaN.
function instantParts(value: string): { seconds: number; fraction: string } {
  if (!validateDateTime(value).valid) throw new Error('Invalid calendar instant')
  const [date, time] = value.toUpperCase().split('T')
  const [year, month, day] = date.split('-').map(Number)
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)$/.exec(time)!
  const [, hour, minute, second, fraction = '', offset] = match
  const dt = new Date(0)
  dt.setUTCFullYear(year, month - 1, day)
  dt.setUTCHours(Number(hour), Number(minute), Number(second ?? '0'), 0)
  const digits = offset.slice(1).replace(':', '')
  const offsetMinutes = offset === 'Z' ? 0 : (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2) || '0')) * (offset[0] === '-' ? -1 : 1)
  return { seconds: dt.getTime() / 1000 - offsetMinutes * 60, fraction }
}

export function compareInstants(left: string, right: string): -1 | 0 | 1 {
  const a = instantParts(left), b = instantParts(right)
  if (a.seconds !== b.seconds) return a.seconds < b.seconds ? -1 : 1
  const length = Math.max(a.fraction.length, b.fraction.length)
  const x = a.fraction.padEnd(length, '0'), y = b.fraction.padEnd(length, '0')
  return x < y ? -1 : x > y ? 1 : 0
}

export function addInstantMilliseconds(value: string, delay: number): string {
  if (!Number.isSafeInteger(delay) || delay < 0) throw new Error('Invalid instant delay')
  const { seconds, fraction } = instantParts(value)
  const digits = fraction.padEnd(3, '0')
  const epoch = seconds * 1000 + Number(digits.slice(0, 3)) + delay
  if (!Number.isSafeInteger(epoch)) throw new Error('Instant delay overflow')
  const result = new Date(epoch).toISOString().replace(/(\.\d{3})Z$/, '$1' + digits.slice(3) + 'Z')
  if (!validateDateTime(result).valid) throw new Error('Instant outside calendar contract')
  return result
}

export function validatePartialTime(input: unknown): ValidationResult<PartialTime> {
  const result = object<PartialTime>(input, {
    value: validateString,
    precision: enumeration(['date', 'instant', 'unknown']),
    timezone: nullable(validateString),
    rawLabel: nullable(validateString),
  })
  if (!result.valid) return result
  const { value, precision } = result.value
  if (precision === 'date' && !validDate(value)) {
    return { valid: false, errors: [{ path: ['value'], code: 'invalid_date', message: 'Expected a possible YYYY-MM-DD calendar date.' }] }
  }
  if (precision === 'instant') {
    const instant = validateDateTime(value)
    if (!instant.valid) return { valid: false, errors: instant.errors.map(error => ({ ...error, path: ['value', ...error.path] })) }
  }
  // Unknown precision preserves source text; it is not promoted to an exact date/time.
  return result
}
