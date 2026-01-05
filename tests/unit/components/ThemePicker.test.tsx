/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { ThemePicker } from '../../../src/components/ThemePicker'

describe('ThemePicker Component', () => {
  beforeEach(() => {
    // Clear data-theme attribute before each test
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders with system theme by default', () => {
    render(<ThemePicker />)

    const select = screen.getByLabelText('Select theme') as HTMLSelectElement
    expect(select.value).toBe('system')
  })

  it('renders with specified theme', () => {
    render(<ThemePicker theme="dark" />)

    const select = screen.getByLabelText('Select theme') as HTMLSelectElement
    expect(select.value).toBe('dark')
  })

  it('renders all theme options', () => {
    render(<ThemePicker />)

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('System')
    expect(options[1]).toHaveTextContent('Light')
    expect(options[2]).toHaveTextContent('Dark')
  })

  it('applies theme to document when changed', () => {
    render(<ThemePicker />)

    const select = screen.getByLabelText('Select theme') as HTMLSelectElement

    // Change to dark
    fireEvent.change(select, { target: { value: 'dark' } })
    expect(document.documentElement.dataset.theme).toBe('dark')

    // Change to light
    fireEvent.change(select, { target: { value: 'light' } })
    expect(document.documentElement.dataset.theme).toBe('light')

    // Change to system
    fireEvent.change(select, { target: { value: 'system' } })
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('calls onThemeChange callback when theme changes', () => {
    const onThemeChange = vi.fn()
    render(<ThemePicker onThemeChange={onThemeChange} />)

    const select = screen.getByLabelText('Select theme')
    fireEvent.change(select, { target: { value: 'dark' } })

    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('has proper ARIA attributes', () => {
    render(<ThemePicker />)

    const select = screen.getByLabelText('Select theme')
    expect(select).toHaveAttribute('aria-label', 'Select theme')
  })
})
