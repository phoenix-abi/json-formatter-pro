/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/preact'
import { Select, SelectOption } from '../../../src/components/Select'

describe('Select Component', () => {
  const testOptions: SelectOption[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]

  it('renders with all options', () => {
    const onChange = vi.fn()
    render(
      <Select
        value="option1"
        options={testOptions}
        onChange={onChange}
        ariaLabel="Test select"
      />
    )

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
    expect(options[0]).toHaveTextContent('Option 1')
    expect(options[1]).toHaveTextContent('Option 2')
    expect(options[2]).toHaveTextContent('Option 3')
  })

  it('shows the selected value', () => {
    const onChange = vi.fn()
    render(
      <Select
        value="option2"
        options={testOptions}
        onChange={onChange}
        ariaLabel="Test select"
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('option2')
  })

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn()
    render(
      <Select
        value="option1"
        options={testOptions}
        onChange={onChange}
        ariaLabel="Test select"
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'option3' } })

    expect(onChange).toHaveBeenCalledWith('option3')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('uses the provided aria-label', () => {
    const onChange = vi.fn()
    render(
      <Select
        value="option1"
        options={testOptions}
        onChange={onChange}
        ariaLabel="Custom label"
      />
    )

    const select = screen.getByRole('combobox')
    expect(select).toHaveAttribute('aria-label', 'Custom label')
  })

  it('renders without initial value', () => {
    const onChange = vi.fn()
    render(
      <Select
        options={testOptions}
        onChange={onChange}
        ariaLabel="Test select"
      />
    )

    const select = screen.getByRole('combobox') as HTMLSelectElement
    // Should select first option by default
    expect(select.value).toBe('option1')
  })

  it('works with custom value types', () => {
    type CustomType = 'red' | 'green' | 'blue'
    const colorOptions: SelectOption<CustomType>[] = [
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'blue', label: 'Blue' },
    ]

    const onChange = vi.fn<[CustomType], void>()
    render(
      <Select<CustomType>
        value="green"
        options={colorOptions}
        onChange={onChange}
        ariaLabel="Color select"
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'blue' } })

    expect(onChange).toHaveBeenCalledWith('blue')
  })

  it('renders options with correct values and labels', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Select
        value="option1"
        options={testOptions}
        onChange={onChange}
        ariaLabel="Test select"
      />
    )

    const options = container.querySelectorAll('option')
    expect(options[0]).toHaveAttribute('value', 'option1')
    expect(options[0]).toHaveTextContent('Option 1')
    expect(options[1]).toHaveAttribute('value', 'option2')
    expect(options[1]).toHaveTextContent('Option 2')
    expect(options[2]).toHaveAttribute('value', 'option3')
    expect(options[2]).toHaveTextContent('Option 3')
  })

  it('applies correct CSS class', () => {
    const onChange = vi.fn()
    const { container } = render(
      <Select
        value="option1"
        options={testOptions}
        onChange={onChange}
        ariaLabel="Test select"
      />
    )

    const select = container.querySelector('.select')
    expect(select).toBeInTheDocument()
  })
})
