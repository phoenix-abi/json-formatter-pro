import { h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'
import {
  type ParserType,
  setSessionOverride,
  getSessionOverride,
  clearSessionOverride,
} from '../lib/parser-selection'
import { getParserSettings } from '../lib/storage'
import { Select, type SelectOption } from './Select'
import './ParserSelector.css'

export interface ParserSelectorProps {
  /** Current URL for session override */
  url: string
  /** Initial/current parser (from selectParser logic) */
  parser?: ParserType
  /** Callback when parser selection changes */
  onParserChange?: (parser: ParserType) => void
  /** Whether to use session storage for temporary override */
  useSession?: boolean
}

const PARSER_OPTIONS: SelectOption<ParserType>[] = [
  { value: 'custom', label: 'ExactJSON (Precise)' },
  { value: 'native', label: 'Native Parser (Fast)' },
]

/**
 * Parser selector component for toggling between native and custom parsers.
 * Displays current parser and allows switching with optional session override.
 */
export function ParserSelector({
  url,
  parser,
  onParserChange,
  useSession = true,
}: ParserSelectorProps) {
  const [currentParser, setCurrentParser] = useState<ParserType>(parser || 'native')

  // Load initial parser selection
  useEffect(() => {
    // If parser prop is provided, use it (it comes from selectParser logic)
    if (parser) {
      setCurrentParser(parser)
      return
    }

    const loadParser = async () => {
      // Check session override first
      if (useSession) {
        const sessionParser = getSessionOverride(url)
        if (sessionParser) {
          setCurrentParser(sessionParser)
          return
        }
      }

      // Fall back to settings
      const settings = await getParserSettings()
      setCurrentParser(settings.defaultParser)
    }

    loadParser()
  }, [url, parser, useSession])

  const handleParserChange = useCallback(
    (newParser: string) => {
      const parser = newParser as ParserType
      setCurrentParser(parser)

      // Set session override if enabled
      if (useSession) {
        if (parser === currentParser) {
          clearSessionOverride(url)
        } else {
          setSessionOverride(url, parser)
        }
      }

      // Call callback
      if (onParserChange) {
        onParserChange(parser)
      }
    },
    [url, currentParser, useSession, onParserChange]
  )

  return h(Select, {
    value: currentParser,
    options: PARSER_OPTIONS,
    onChange: handleParserChange,
    ariaLabel: 'Select JSON parser',
  })
}
