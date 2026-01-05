import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { RadioGroup, type RadioOption } from '../RadioGroup'
import '../options/DefaultParserSelector'

const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

const SIMPLE_OPTIONS: RadioOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

const OPTIONS_WITH_DESCRIPTION: RadioOption[] = [
  { value: 'basic', label: 'Basic', description: 'Simple and straightforward' },
  { value: 'advanced', label: 'Advanced', description: 'More features and control' },
]

const OPTIONS_WITH_FEATURES: RadioOption[] = [
  {
    value: 'free',
    label: 'Free Plan',
    description: 'Perfect for getting started',
    features: ['✓ 100 requests/day', '✓ Basic support', '⚠ Limited features'],
  },
  {
    value: 'pro',
    label: 'Pro Plan',
    description: 'For professional users',
    features: ['✓ Unlimited requests', '✓ Priority support', '✓ All features'],
  },
]

function RadioGroupWrapper({ options }: { options: RadioOption[] }) {
  const [value, setValue] = useState(options[0].value)

  return h(RadioGroup, {
    name: 'example',
    value,
    options,
    onChange: setValue,
  })
}

export const Simple: Story = {
  render: () => h(RadioGroupWrapper, { options: SIMPLE_OPTIONS }),
}

export const WithDescriptions: Story = {
  render: () => h(RadioGroupWrapper, { options: OPTIONS_WITH_DESCRIPTION }),
}

export const WithFeatures: Story = {
  render: () => h(RadioGroupWrapper, { options: OPTIONS_WITH_FEATURES }),
}
