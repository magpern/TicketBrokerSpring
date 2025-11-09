import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import '../i18n/config'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

