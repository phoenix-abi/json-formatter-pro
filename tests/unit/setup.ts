/**
 * Test setup for Preact component tests
 */

import { cleanup } from '@testing-library/preact'
import { afterEach, expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})
