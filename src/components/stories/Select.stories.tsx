import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { Select, SelectOption } from '../Select'
import '../Select.css'

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
  title: 'Components/Select',
  component: Select,
  decorators: [ThemedBackground],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Currently selected value',
    },
    options: {
      control: 'object',
      description: 'Array of { value, label } options',
    },
    onChange: {
      action: 'changed',
      description: 'Callback fired when selection changes',
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessibility label for the select',
    },
    useStorage: {
      control: 'boolean',
      description: 'Whether to sync with chrome.storage.local',
    },
    storageKey: {
      control: 'text',
      description: 'Storage key (only used if useStorage=true)',
    },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

const fruitOptions: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
]

const sizeOptions: SelectOption[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'Extra Large' },
]

const themeOptions: SelectOption[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export const Default: Story = {
  args: {
    value: 'apple',
    options: fruitOptions,
    onChange: (value) => console.log('Selected:', value),
    ariaLabel: 'Select a fruit',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default select component with fruit options.',
      },
    },
  },
}

export const SizeSelector: Story = {
  args: {
    value: 'medium',
    options: sizeOptions,
    onChange: (value) => console.log('Selected size:', value),
    ariaLabel: 'Select size',
  },
  parameters: {
    docs: {
      description: {
        story: 'Select component for choosing a size.',
      },
    },
  },
}

export const ThemeSelector: Story = {
  args: {
    value: 'system',
    options: themeOptions,
    onChange: (value) => console.log('Selected theme:', value),
    ariaLabel: 'Select theme',
  },
  parameters: {
    docs: {
      description: {
        story: 'Select component for theme selection (same as ThemePicker).',
      },
    },
  },
}

export const Interactive: Story = {
  render: () => {
    const [selectedFruit, setSelectedFruit] = useState('apple')
    const [selectedSize, setSelectedSize] = useState('medium')

    return h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
      [
        h('div', {}, [
          h('label', { style: { display: 'block', marginBottom: '8px' } }, [
            'Choose a fruit:',
          ]),
          h(Select, {
            value: selectedFruit,
            options: fruitOptions,
            onChange: setSelectedFruit,
            ariaLabel: 'Select fruit',
          }),
          h(
            'p',
            { style: { marginTop: '8px', fontSize: '14px' } },
            `You selected: ${selectedFruit}`
          ),
        ]),
        h('div', {}, [
          h('label', { style: { display: 'block', marginBottom: '8px' } }, [
            'Choose a size:',
          ]),
          h(Select, {
            value: selectedSize,
            options: sizeOptions,
            onChange: setSelectedSize,
            ariaLabel: 'Select size',
          }),
          h(
            'p',
            { style: { marginTop: '8px', fontSize: '14px' } },
            `You selected: ${selectedSize}`
          ),
        ]),
      ]
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive select components showing real-time selection updates.',
      },
    },
  },
}

export const WithCustomTypes: Story = {
  render: () => {
    type Priority = 'low' | 'medium' | 'high' | 'critical'
    const priorityOptions: SelectOption<Priority>[] = [
      { value: 'low', label: 'Low Priority' },
      { value: 'medium', label: 'Medium Priority' },
      { value: 'high', label: 'High Priority' },
      { value: 'critical', label: 'Critical' },
    ]

    const [priority, setPriority] = useState<Priority>('medium')

    return h('div', {}, [
      h('label', { style: { display: 'block', marginBottom: '8px' } }, [
        'Select priority:',
      ]),
      h(Select<Priority>, {
        value: priority,
        options: priorityOptions,
        onChange: setPriority,
        ariaLabel: 'Select priority',
      }),
      h(
        'p',
        { style: { marginTop: '8px', fontSize: '14px' } },
        `Priority: ${priority}`
      ),
    ])
  },
  parameters: {
    docs: {
      description: {
        story:
          'Select component with TypeScript generics for type-safe custom value types.',
      },
    },
  },
}

export const ManyOptions: Story = {
  render: () => {
    const numberOptions: SelectOption[] = Array.from({ length: 50 }, (_, i) => ({
      value: `${i + 1}`,
      label: `Option ${i + 1}`,
    }))

    const [selected, setSelected] = useState('1')

    return h('div', {}, [
      h('label', { style: { display: 'block', marginBottom: '8px' } }, [
        'Select from many options:',
      ]),
      h(Select, {
        value: selected,
        options: numberOptions,
        onChange: setSelected,
        ariaLabel: 'Select number',
      }),
      h(
        'p',
        { style: { marginTop: '8px', fontSize: '14px' } },
        `Selected: ${selected}`
      ),
    ])
  },
  parameters: {
    docs: {
      description: {
        story: 'Select component with many options to test scrolling behavior.',
      },
    },
  },
}
