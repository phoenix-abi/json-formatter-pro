/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/preact'
import { h } from 'preact'
import { Toolbar } from '../../../src/components/Toolbar'

describe('Toolbar Component', () => {
  it('renders with default sticky positioning', () => {
    const { container } = render(<Toolbar />)

    const toolbar = container.querySelector('.toolbar')
    expect(toolbar).toBeInTheDocument()
    expect(toolbar).toHaveClass('sticky')
  })

  it('renders without sticky positioning when sticky=false', () => {
    const { container } = render(<Toolbar sticky={false} />)

    const toolbar = container.querySelector('.toolbar')
    expect(toolbar).toBeInTheDocument()
    expect(toolbar).not.toHaveClass('sticky')
  })

  it('renders left content', () => {
    const { container } = render(
      <Toolbar left={<div data-testid="left-content">Left</div>} />
    )

    const leftContent = container.querySelector('[data-testid="left-content"]')
    expect(leftContent).toBeInTheDocument()
    expect(leftContent?.parentElement).toHaveClass('toolbar-left')
  })

  it('renders center content', () => {
    const { container } = render(
      <Toolbar center={<div data-testid="center-content">Center</div>} />
    )

    const centerContent = container.querySelector('[data-testid="center-content"]')
    expect(centerContent).toBeInTheDocument()
    expect(centerContent?.parentElement).toHaveClass('toolbar-center')
  })

  it('renders right content', () => {
    const { container } = render(
      <Toolbar right={<div data-testid="right-content">Right</div>} />
    )

    const rightContent = container.querySelector('[data-testid="right-content"]')
    expect(rightContent).toBeInTheDocument()
    expect(rightContent?.parentElement).toHaveClass('toolbar-right')
  })

  it('renders all sections when provided', () => {
    const { container } = render(
      <Toolbar
        left={<div>Left</div>}
        center={<div>Center</div>}
        right={<div>Right</div>}
      />
    )

    expect(container.querySelector('.toolbar-left')).toBeInTheDocument()
    expect(container.querySelector('.toolbar-center')).toBeInTheDocument()
    expect(container.querySelector('.toolbar-right')).toBeInTheDocument()
  })
})
