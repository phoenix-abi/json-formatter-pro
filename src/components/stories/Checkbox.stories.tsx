import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Checkbox } from '../Checkbox'

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

function CheckboxWrapper(props: Partial<React.ComponentProps<typeof Checkbox>>) {
  const [checked, setChecked] = useState(props.checked || false)

  return h(Checkbox, {
    checked,
    onChange: setChecked,
    label: 'Example checkbox',
    ...props,
  })
}

export const Default: Story = {
  render: () => h(CheckboxWrapper, { label: 'Enable feature' }),
}

export const WithHelpText: Story = {
  render: () =>
    h(CheckboxWrapper, {
      label: 'Enable analytics',
      helpText: 'This will collect anonymous usage data to improve the extension',
    }),
}

export const Checked: Story = {
  render: () =>
    h(CheckboxWrapper, {
      checked: true,
      label: 'Already enabled',
    }),
}

export const LongLabel: Story = {
  render: () =>
    h(CheckboxWrapper, {
      label: 'Enable this really long feature that has a very descriptive name',
      helpText:
        'This feature does many things and has a lot of help text to explain what it does and why you might want to enable it.',
    }),
}
