import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { Button } from '../Button'
import '../Button.css'

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
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      },
    },
    h(Story)
  )
}

const meta = {
  title: 'Components/Button',
  component: Button,
  decorators: [ThemedBackground],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Button content (text or elements)',
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'danger'],
      description: 'Visual style variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    onClick: {
      action: 'clicked',
      description: 'Callback fired when button is clicked',
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      description: 'HTML button type',
    },
    ariaLabel: {
      control: 'text',
      description: 'Custom aria-label (optional)',
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Primary Action',
    variant: 'primary',
    onClick: () => console.log('Primary clicked'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Primary button for the main action on a page. Uses green styling to draw attention.',
      },
    },
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
    onClick: () => console.log('Secondary clicked'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Secondary button (default). Used for standard actions with gray styling.',
      },
    },
  },
}

export const Tertiary: Story = {
  args: {
    children: 'Tertiary Action',
    variant: 'tertiary',
    onClick: () => console.log('Tertiary clicked'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tertiary button for less prominent actions. Transparent with minimal styling.',
      },
    },
  },
}

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
    onClick: () => console.log('Danger clicked'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Danger button for destructive actions like deleting. Uses red styling to indicate caution.',
      },
    },
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    variant: 'primary',
    disabled: true,
    onClick: () => console.log('Should not fire'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Buttons can be disabled to prevent interaction.',
      },
    },
  },
}

export const AllVariants: Story = {
  render: () =>
    h(
      'div',
      { style: { display: 'flex', gap: '12px', flexDirection: 'column' } },
      [
        h(
          'div',
          { style: { display: 'flex', gap: '12px' } },
          [
            h(
              Button,
              { variant: 'primary', onClick: () => console.log('Primary') },
              'Primary'
            ),
            h(
              Button,
              { variant: 'secondary', onClick: () => console.log('Secondary') },
              'Secondary'
            ),
            h(
              Button,
              { variant: 'tertiary', onClick: () => console.log('Tertiary') },
              'Tertiary'
            ),
            h(
              Button,
              { variant: 'danger', onClick: () => console.log('Danger') },
              'Danger'
            ),
          ]
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '12px' } },
          [
            h(
              Button,
              { variant: 'primary', disabled: true },
              'Primary Disabled'
            ),
            h(
              Button,
              { variant: 'secondary', disabled: true },
              'Secondary Disabled'
            ),
            h(
              Button,
              { variant: 'tertiary', disabled: true },
              'Tertiary Disabled'
            ),
            h(Button, { variant: 'danger', disabled: true }, 'Danger Disabled'),
          ]
        ),
      ]
    ),
  parameters: {
    docs: {
      description: {
        story: 'All button variants in enabled and disabled states.',
      },
    },
  },
}

export const Interactive: Story = {
  render: () => {
    let clickCount = 0
    const handleClick = () => {
      clickCount++
      console.log(`Clicked ${clickCount} times`)
      alert(`Button clicked ${clickCount} times!`)
    }

    return h(
      'div',
      { style: { display: 'flex', gap: '12px' } },
      [
        h(Button, { variant: 'primary', onClick: handleClick }, 'Click Me'),
        h(
          Button,
          { variant: 'danger', onClick: handleClick },
          'Or Click Me'
        ),
      ]
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive buttons that respond to clicks.',
      },
    },
  },
}
