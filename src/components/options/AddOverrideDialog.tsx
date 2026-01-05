import { h } from 'preact'
import { useState, useEffect, useRef } from 'preact/hooks'
import { RadioGroup, type RadioOption } from '../RadioGroup'
import type { ParserType } from '../../lib/parser-selection'

export interface AddOverrideDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (pattern: string, parser: ParserType) => void
}

const PARSER_OPTIONS: RadioOption<ParserType>[] = [
  { value: 'custom', label: 'ExactJSON' },
  { value: 'native', label: 'Native Parser' },
]

/**
 * Dialog for adding new URL parser overrides
 */
export function AddOverrideDialog({ isOpen, onClose, onSubmit }: AddOverrideDialogProps) {
  const [pattern, setPattern] = useState('')
  const [parser, setParser] = useState<ParserType>('native')
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Sync dialog open/close state
  useEffect(() => {
    if (!dialogRef.current) return

    if (isOpen) {
      dialogRef.current.showModal()
      setPattern('')
      setParser('native')
    } else {
      dialogRef.current.close()
    }
  }, [isOpen])

  const handleSubmit = (e: Event) => {
    e.preventDefault()
    onSubmit(pattern.trim(), parser)
  }

  return h(
    'dialog',
    { ref: dialogRef, id: 'add-override-dialog' },
    h(
      'form',
      { id: 'add-override-form', onSubmit: handleSubmit },
      h('h3', null, 'Add Parser Override'),

      // Pattern input
      h(
        'div',
        { className: 'form-group' },
        h('label', { htmlFor: 'override-pattern' }, 'URL Pattern'),
        h('input', {
          type: 'text',
          id: 'override-pattern',
          placeholder: 'api.example.com/*',
          required: true,
          value: pattern,
          onInput: (e: Event) => setPattern((e.target as HTMLInputElement).value),
        }),
        h('p', { className: 'help-text' }, 'Examples: api.example.com/*, *.example.com, */api/v1/*')
      ),

      // Parser selection
      h(
        'div',
        { className: 'form-group' },
        h('label', null, 'Parser'),
        h(RadioGroup, {
          name: 'override-parser',
          value: parser,
          options: PARSER_OPTIONS,
          onChange: (value: string) => setParser(value as ParserType),
          className: 'radio-group-compact',
        })
      ),

      // Actions
      h(
        'div',
        { className: 'dialog-actions' },
        h('button', { type: 'submit', className: 'button-primary' }, 'Add Override'),
        h('button', { type: 'button', className: 'button-secondary', onClick: onClose }, 'Cancel')
      )
    )
  )
}
