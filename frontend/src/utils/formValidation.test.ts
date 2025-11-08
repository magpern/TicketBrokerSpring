import { describe, it, expect } from 'vitest'

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
  gdprConsent: boolean
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

  if (!data.gdprConsent) {
    errors.gdprConsent = 'Du måste godkänna GDPR-villkoren'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

describe('Form Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@example.co.uk')).toBe(true)
      expect(validateEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false)
      expect(validateEmail('invalid@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
      expect(validateEmail('invalid@example')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validatePhone', () => {
    it('should validate Swedish phone numbers', () => {
      expect(validatePhone('+46701234567')).toBe(true)
      expect(validatePhone('0701234567')).toBe(true)
      expect(validatePhone('+46 70 123 45 67')).toBe(true)
      expect(validatePhone('070-123-45-67')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false)
      expect(validatePhone('07012345')).toBe(false) // Too short
      expect(validatePhone('+4670123456789')).toBe(false) // Too long
      expect(validatePhone('')).toBe(false)
    })
  })

  describe('validateRequired', () => {
    it('should validate non-empty strings', () => {
      expect(validateRequired('test')).toBe(true)
      expect(validateRequired('  test  ')).toBe(true)
    })

    it('should reject empty or whitespace-only strings', () => {
      expect(validateRequired('')).toBe(false)
      expect(validateRequired('   ')).toBe(false)
    })
  })

  describe('validateBookingForm', () => {
    it('should validate a complete valid form', () => {
      const result = validateBookingForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+46701234567',
        gdprConsent: true,
      })

      expect(result.isValid).toBe(true)
      expect(Object.keys(result.errors)).toHaveLength(0)
    })

    it('should return errors for missing required fields', () => {
      const result = validateBookingForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gdprConsent: false,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.firstName).toBeDefined()
      expect(result.errors.lastName).toBeDefined()
      expect(result.errors.email).toBeDefined()
      expect(result.errors.phone).toBeDefined()
      expect(result.errors.gdprConsent).toBeDefined()
    })

    it('should validate email format', () => {
      const result = validateBookingForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        phone: '+46701234567',
        gdprConsent: true,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.email).toBe('Ogiltig e-postadress')
    })

    it('should validate phone format', () => {
      const result = validateBookingForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '123',
        gdprConsent: true,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.phone).toBe('Ogiltigt telefonnummer')
    })

    it('should require GDPR consent', () => {
      const result = validateBookingForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+46701234567',
        gdprConsent: false,
      })

      expect(result.isValid).toBe(false)
      expect(result.errors.gdprConsent).toBe('Du måste godkänna GDPR-villkoren')
    })
  })
})

