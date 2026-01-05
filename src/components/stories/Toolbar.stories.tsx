import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { Toolbar } from '../Toolbar'
import { Toggle } from '../Toggle'
import { ThemePicker } from '../ThemePicker'
import { useState } from 'preact/hooks'
import '../Toolbar.css'
import '../Toggle.css'
import '../ThemePicker.css'

const meta = {
  title: 'Components/Toolbar',
  component: Toolbar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    sticky: {
      control: 'boolean',
      description: 'Whether the toolbar should stick to the top',
    },
    left: {
      description: 'Content for the left section',
    },
    center: {
      description: 'Content for the center section',
    },
    right: {
      description: 'Content for the right section',
    },
  },
} satisfies Meta<typeof Toolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    sticky: true,
  },
}

export const LeftContent: Story = {
  args: {
    sticky: true,
    left: h('div', {}, 'Left content'),
  },
}

export const CenterContent: Story = {
  args: {
    sticky: true,
    center: h('div', {}, 'Center content'),
  },
}

export const RightContent: Story = {
  args: {
    sticky: true,
    right: h('div', {}, 'Right content'),
  },
}

export const AllSections: Story = {
  args: {
    sticky: true,
    left: h('div', {}, 'Left'),
    center: h('div', {}, 'Center'),
    right: h('div', {}, 'Right'),
  },
}

export const NotSticky: Story = {
  args: {
    sticky: false,
    left: h('div', {}, 'Left'),
    center: h('div', {}, 'Center'),
    right: h('div', {}, 'Right'),
  },
}

// Interactive example with real components
function ToolbarWithComponents() {
  const [mode, setMode] = useState<'raw' | 'parsed'>('parsed')
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')

  return h(Toolbar, {
    sticky: true,
    left: h(Toggle, { mode, onModeChange: setMode }),
    right: h(ThemePicker, { theme, useStorage: false, onThemeChange: setTheme }),
  })
}

export const WithComponents: Story = {
  render: () => h(ToolbarWithComponents, {}),
  parameters: {
    docs: {
      description: {
        story:
          'Toolbar with real Toggle and ThemePicker components. This shows the typical usage in the JSON Formatter Pro extension.',
      },
    },
  },
}

// Example with scrollable content to demonstrate sticky behavior
function ToolbarWithScrollableContent() {
  const [mode, setMode] = useState<'raw' | 'parsed'>('parsed')

  return h(
    'div',
    {
      style: {
        height: '600px',
        overflow: 'auto',
        border: '2px solid #ccc',
        position: 'relative',
      },
    },
    [
      h(Toolbar, {
        sticky: true,
        left: h(Toggle, { mode, onModeChange: setMode }),
        right: h('div', {}, 'Scroll down ⬇️'),
      }),
      h(
        'div',
        { style: { padding: '20px', minHeight: '150%' } },
        [
          h('h2', { style: { marginTop: '0' } }, 'Scroll down to test sticky behavior'),
          h('p', {}, 'The toolbar should remain at the top of this scrollable container.'),
          h(
            'div',
            {
              style: {
                height: '1200px',
                background: 'linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 50%, #d0d0d0 100%)',
                padding: '20px',
                marginTop: '20px',
              },
            },
            [
              h('p', { style: { margin: '0 0 20px 0' } }, '👆 The toolbar should be stuck at the top'),
              h('p', { style: { marginTop: '400px' } }, '⬆️ Keep scrolling up and down to see the sticky effect'),
              h('p', { style: { marginTop: '400px' } }, '✨ The toolbar stays visible as you scroll'),
              h('p', { style: { marginTop: '400px' } }, '⬆️ Scroll back to the top'),
            ]
          ),
        ]
      ),
    ]
  )
}

export const StickyDemo: Story = {
  render: () => h(ToolbarWithScrollableContent, {}),
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        story: 'Demonstrates the sticky positioning. Scroll within the container to see the toolbar stick to the top.',
      },
    },
  },
}
