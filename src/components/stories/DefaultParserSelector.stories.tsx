import type { Meta, StoryObj } from '@storybook/preact'
import { h } from 'preact'
import { useState } from 'preact/hooks'
import { DefaultParserSelector } from '../options/DefaultParserSelector'
import type { ParserType } from '../../lib/parser-selection'

const meta = {
  title: 'Options/DefaultParserSelector',
  component: DefaultParserSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DefaultParserSelector>

export default meta
type Story = StoryObj<typeof meta>

function DefaultParserSelectorWrapper() {
  const [value, setValue] = useState<ParserType>('native')

  return h(DefaultParserSelector, {
    value,
    onChange: setValue,
  })
}

export const NativeSelected: Story = {
  render: () => h(DefaultParserSelectorWrapper),
}

export const CustomSelected: Story = {
  render: () => {
    const [value, setValue] = useState<ParserType>('custom')
    return h(DefaultParserSelector, { value, onChange: setValue })
  },
}

export const Interactive: Story = {
  render: () => h(DefaultParserSelectorWrapper),
  parameters: {
    docs: {
      description: {
        story: 'Interactive parser selector that maintains its own state.',
      },
    },
  },
}
