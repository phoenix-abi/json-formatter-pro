import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { Toggle } from '../Toggle'
import { useState } from 'preact/hooks'
import '../Toggle.css'

// Decorator to show component on themed background
const ThemedBackground = (Story: any) => {
  return h(
    'div',
    {
      style: {
        padding: '40px',
        background: 'var(--bg, #ffffff)',
        borderRadius: '8px',
        minWidth: '300px',
      },
    },
    h(Story)
  )
}

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  decorators: [ThemedBackground],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text displayed next to the switch',
    },
    checked: {
      control: 'boolean',
      description: 'Whether the switch is in the ON position',
    },
    onChange: {
      action: 'changed',
      description: 'Callback fired when switch is toggled',
    },
    ariaLabel: {
      control: 'text',
      description: 'Custom aria-label (optional)',
    },
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

// Wrapper component for interactive stories
function ToggleWrapper({ label = 'Format' }: { label?: string }) {
  const [checked, setChecked] = useState(true)

  return h(Toggle, { label, checked, onChange: setChecked })
}

export const On: Story = {
  args: {
    label: 'Format',
    checked: true,
    onChange: (checked) => console.log('Changed to:', checked),
  },
  parameters: {
    docs: {
      description: {
        story: 'Switch in ON state. The switch is green and the thumb is on the right.',
      },
    },
  },
}

export const Off: Story = {
  args: {
    label: 'Format',
    checked: false,
    onChange: (checked) => console.log('Changed to:', checked),
  },
  parameters: {
    docs: {
      description: {
        story: 'Switch in OFF state. The switch is gray and the thumb is on the left.',
      },
    },
  },
}

export const Interactive: Story = {
  render: () => h(ToggleWrapper, { label: 'Format' }),
  parameters: {
    docs: {
      description: {
        story: 'Interactive on/off switch. Click to toggle between ON and OFF states.',
      },
    },
  },
}

export const CustomLabel: Story = {
  render: () => h(ToggleWrapper, { label: 'Enable Feature' }),
  parameters: {
    docs: {
      description: {
        story: 'Toggle with custom label text. The component is fully generic and reusable.',
      },
    },
  },
}
