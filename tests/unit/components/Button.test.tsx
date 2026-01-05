/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Button } from '../../../src/components/Button'

describe('Button Component', () => {
  it('renders with children text', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click Me</Button>)

    expect(screen.getByRole('button')).toHaveTextContent('Click Me')
  })

  it('applies secondary variant by default', () => {
    const onClick = vi.fn()
    const { container } = render(<Button onClick={onClick}>Button</Button>)

    const button = container.querySelector('button')
    expect(button).toHaveClass('btn')
    expect(button).toHaveClass('btn-secondary')
  })

  it('applies primary variant class', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button variant="primary" onClick={onClick}>
        Primary
      </Button>
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('btn-primary')
  })

  it('applies secondary variant class', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button variant="secondary" onClick={onClick}>
        Secondary
      </Button>
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('btn-secondary')
  })

  it('applies tertiary variant class', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button variant="tertiary" onClick={onClick}>
        Tertiary
      </Button>
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('btn-tertiary')
  })

  it('applies danger variant class', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button variant="danger" onClick={onClick}>
        Delete
      </Button>
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('btn-danger')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click Me</Button>)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Click Me
      </Button>
    )

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onClick).not.toHaveBeenCalled()
  })

  it('has disabled attribute when disabled prop is true', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('uses button type by default', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Button</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('uses custom type when provided', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} type="submit">
        Submit
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('uses custom aria-label when provided', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} ariaLabel="Custom label">
        Button
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Custom label')
  })

  it('does not have aria-label when not provided', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Button</Button>)

    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('aria-label')
  })

  it('receives MouseEvent in onClick callback', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click Me</Button>)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledWith(expect.any(Object))
    const event = onClick.mock.calls[0][0]
    expect(event.type).toBe('click')
  })

  it('renders complex children', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick}>
        <span>Icon</span> Text
      </Button>
    )

    const button = screen.getByRole('button')
    expect(button.querySelector('span')).toHaveTextContent('Icon')
    expect(button).toHaveTextContent('Icon Text')
  })
})
