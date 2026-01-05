import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { NumberInput } from '../NumberInput'

const meta = {
  title: 'Components/NumberInput',
  component: NumberInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NumberInput>

export default meta
type Story = StoryObj<typeof meta>

function NumberInputWrapper(props: Partial<React.ComponentProps<typeof NumberInput>>) {
  const [value, setValue] = useState(props.value || 10)

  return h(NumberInput, {
    value,
    onChange: setValue,
    label: 'Example input',
    ...props,
  })
}

export const Default: Story = {
  render: () =>
    h(NumberInputWrapper, {
      label: 'Enter a number',
    }),
}

export const WithRange: Story = {
  render: () =>
    h(NumberInputWrapper, {
      label: 'Set threshold',
      min: 0,
      max: 100,
      value: 50,
    }),
}

export const WithSuffix: Story = {
  render: () =>
    h(NumberInputWrapper, {
      label: 'File size limit',
      value: 10,
      suffix: 'MB',
      min: 0,
      max: 1000,
    }),
}

export const WithHelpText: Story = {
  render: () =>
    h(NumberInputWrapper, {
      label: 'Maximum depth',
      value: 1000,
      min: 10,
      max: 10000,
      helpText: 'Prevents stack overflow from deeply nested structures',
    }),
}
