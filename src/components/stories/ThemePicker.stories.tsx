import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { ThemePicker, type Theme } from '../ThemePicker'
import { useState } from 'preact/hooks'
import '../ThemePicker.css'

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
  title: 'Components/ThemePicker',
  component: ThemePicker,
  decorators: [ThemedBackground],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: ['system', 'light', 'dark'],
      description: 'Current theme',
    },
    useStorage: {
      control: 'boolean',
      description: 'Whether to sync with chrome.storage',
    },
    storageKey: {
      control: 'text',
      description: 'Storage key for persisting theme preference',
    },
    onThemeChange: {
      action: 'themeChanged',
      description: 'Callback fired when theme changes',
    },
  },
} satisfies Meta<typeof ThemePicker>

export default meta
type Story = StoryObj<typeof meta>

// Wrapper component for interactive stories
function ThemePickerWrapper() {
  const [theme, setTheme] = useState<Theme>('system')

  return h(ThemePicker, {
    theme,
    useStorage: false,
    onThemeChange: setTheme,
  })
}

export const System: Story = {
  args: {
    theme: 'system',
    useStorage: false,
    onThemeChange: (theme) => console.log('Theme changed to:', theme),
  },
}

export const Light: Story = {
  args: {
    theme: 'light',
    useStorage: false,
    onThemeChange: (theme) => console.log('Theme changed to:', theme),
  },
}

export const Dark: Story = {
  args: {
    theme: 'dark',
    useStorage: false,
    onThemeChange: (theme) => console.log('Theme changed to:', theme),
  },
}

export const Interactive: Story = {
  render: () => h(ThemePickerWrapper, {}),
  parameters: {
    docs: {
      description: {
        story:
          'Interactive theme picker that maintains its own state. Changes the theme in real-time.',
      },
    },
  },
}

export const WithStorageSync: Story = {
  args: {
    theme: 'system',
    useStorage: true,
    storageKey: 'themeOverride',
    onThemeChange: (theme) => console.log('Theme changed to:', theme),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Theme picker with chrome.storage synchronization (requires browser extension context).',
      },
    },
  },
}
