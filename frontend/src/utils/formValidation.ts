/**
 * Form validation utilities
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  // Swedish phone number format: +46XXXXXXXXX or 0XXXXXXXXX
  const phoneRegex = /^(\+46|0)[1-9]\d{8,9}$/
  return phoneRegex.test(phone.replace(/\s|-/g, ''))
}

export function validateRequired(value: string): boolean {
  return value.trim().length > 0
}

export function validateBookingForm(data: {
  firstName: string
  lastName: string
  email: string
  phone: string
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  if (!validateRequired(data.firstName)) {
    errors.firstName = 'Förnamn är obligatoriskt'
  }

  if (!validateRequired(data.lastName)) {
    errors.lastName = 'Efternamn är obligatoriskt'
  }

  if (!validateRequired(data.email)) {
    errors.email = 'E-post är obligatoriskt'
  } else if (!validateEmail(data.email)) {
    errors.email = 'Ogiltig e-postadress'
  }

  if (!validateRequired(data.phone)) {
    errors.phone = 'Telefonnummer är obligatoriskt'
  } else if (!validatePhone(data.phone)) {
    errors.phone = 'Ogiltigt telefonnummer'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

