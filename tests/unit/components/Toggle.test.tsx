/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Toggle } from '../../../src/components/Toggle'

describe('Toggle Component', () => {
  it('renders with custom label', () => {
    const onChange = vi.fn()
    render(<Toggle label="Format" checked={true} onChange={onChange} />)

    expect(screen.getByText('Format')).toBeInTheDocument()
  })

  it('renders switch in ON state when checked', () => {
    const onChange = vi.fn()
    render(<Toggle label="Test" checked={true} onChange={onChange} />)

    const switchButton = screen.getByRole('switch')
    expect(switchButton).toBeInTheDocument()
    expect(switchButton).toHaveAttribute('aria-checked', 'true')
    expect(switchButton).toHaveClass('on')
  })

  it('renders switch in OFF state when unchecked', () => {
    const onChange = vi.fn()
    render(<Toggle label="Test" checked={false} onChange={onChange} />)

    const switchButton = screen.getByRole('switch')
    expect(switchButton).toHaveAttribute('aria-checked', 'false')
    expect(switchButton).toHaveClass('off')
  })

  it('calls onChange with opposite value when clicked', () => {
    const onChange = vi.fn()
    render(<Toggle label="Test" checked={true} onChange={onChange} />)

    const switchButton = screen.getByRole('switch')
    fireEvent.click(switchButton)

    expect(onChange).toHaveBeenCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('calls onChange when toggling from off to on', () => {
    const onChange = vi.fn()
    render(<Toggle label="Test" checked={false} onChange={onChange} />)

    const switchButton = screen.getByRole('switch')
    fireEvent.click(switchButton)

    expect(onChange).toHaveBeenCalledWith(true)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('uses default aria-label based on label and state', () => {
    const onChange = vi.fn()
    render(<Toggle label="Format" checked={true} onChange={onChange} />)

    const switchButton = screen.getByRole('switch')
    expect(switchButton).toHaveAttribute('aria-label', 'Format enabled')
  })

  it('uses custom aria-label when provided', () => {
    const onChange = vi.fn()
    render(<Toggle label="Test" checked={true} onChange={onChange} ariaLabel="Custom label" />)

    const switchButton = screen.getByRole('switch')
    expect(switchButton).toHaveAttribute('aria-label', 'Custom label')
  })

  it('has proper structure with track and thumb', () => {
    const onChange = vi.fn()
    const { container } = render(<Toggle label="Test" checked={true} onChange={onChange} />)

    const track = container.querySelector('.toggle-switch-track')
    const thumb = container.querySelector('.toggle-switch-thumb')

    expect(track).toBeInTheDocument()
    expect(thumb).toBeInTheDocument()
  })
})
