/**
 * Unit tests for Pull Parser
 */

import { describe, test, expect } from 'vitest'
import { PullParser, createPullParser } from '../../../src/lib/parser/pull-parser'
import { ParseError } from '../../../src/lib/parser/events'
import type { ParserEvent } from '../../../src/lib/parser/events'

describe('PullParser', () => {
  describe('Primitives', () => {
    test('parses string value', () => {
      const parser = new PullParser('"hello"')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('value')
      expect(events[0].value.kind).toBe('string')
      expect(events[0].value.value).toBe('hello')
    })

    test('parses number value', () => {
      const parser = new PullParser('42')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('value')
      expect(events[0].value.kind).toBe('number')
      expect(events[0].value.value).toBe(42)
    })

    test('parses true', () => {
      const parser = new PullParser('true')
      const events = Array.from(parser.events())

      expect(events[0].value.kind).toBe('boolean')
      expect(events[0].value.value).toBe(true)
    })

    test('parses false', () => {
      const parser = new PullParser('false')
      const events = Array.from(parser.events())

      expect(events[0].value.kind).toBe('boolean')
      expect(events[0].value.value).toBe(false)
    })

    test('parses null', () => {
      const parser = new PullParser('null')
      const events = Array.from(parser.events())

      expect(events[0].value.kind).toBe('null')
    })
  })

  describe('Objects', () => {
    test('parses empty object', () => {
      const parser = new PullParser('{}')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('startObject')
      expect(events[1].type).toBe('endObject')
    })

    test('parses object with one entry', () => {
      const parser = new PullParser('{"name":"Alice"}')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(4)
      expect(events[0].type).toBe('startObject')
      expect(events[1].type).toBe('key')
      expect(events[1].value).toBe('name')
      expect(events[2].type).toBe('value')
      expect(events[2].value.kind).toBe('string')
      expect(events[2].value.value).toBe('Alice')
      expect(events[3].type).toBe('endObject')
    })

    test('parses object with multiple entries', () => {
      const parser = new PullParser('{"name":"Alice","age":30}')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(6)
      expect(events[0].type).toBe('startObject')
      expect(events[1].type).toBe('key')
      expect(events[1].value).toBe('name')
      expect(events[2].type).toBe('value')
      expect(events[3].type).toBe('key')
      expect(events[3].value).toBe('age')
      expect(events[4].type).toBe('value')
      expect(events[5].type).toBe('endObject')
    })

    test('parses nested object', () => {
      const parser = new PullParser('{"user":{"name":"Alice"}}')
      const events = Array.from(parser.events())

      expect(events[0].type).toBe('startObject')
      expect(events[1].type).toBe('key')
      expect(events[1].value).toBe('user')
      expect(events[2].type).toBe('startObject')
      expect(events[3].type).toBe('key')
      expect(events[3].value).toBe('name')
      expect(events[4].type).toBe('value')
      expect(events[5].type).toBe('endObject')
      expect(events[6].type).toBe('endObject')
    })
  })

  describe('Arrays', () => {
    test('parses empty array', () => {
      const parser = new PullParser('[]')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('startArray')
      expect(events[1].type).toBe('endArray')
    })

    test('parses array with one element', () => {
      const parser = new PullParser('[42]')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(3)
      expect(events[0].type).toBe('startArray')
      expect(events[1].type).toBe('value')
      expect(events[1].value.kind).toBe('number')
      expect(events[2].type).toBe('endArray')
    })

    test('parses array with multiple elements', () => {
      const parser = new PullParser('[1,2,3]')
      const events = Array.from(parser.events())

      expect(events).toHaveLength(5)
      expect(events[0].type).toBe('startArray')
      expect(events[1].type).toBe('value')
      expect(events[2].type).toBe('value')
      expect(events[3].type).toBe('value')
      expect(events[4].type).toBe('endArray')
    })

    test('parses nested array', () => {
      const parser = new PullParser('[[1,2],[3,4]]')
      const events = Array.from(parser.events())

      expect(events[0].type).toBe('startArray')
      expect(events[1].type).toBe('startArray')
      expect(events[2].type).toBe('value')
      expect(events[3].type).toBe('value')
      expect(events[4].type).toBe('endArray')
      expect(events[5].type).toBe('startArray')
      expect(events[6].type).toBe('value')
      expect(events[7].type).toBe('value')
      expect(events[8].type).toBe('endArray')
      expect(events[9].type).toBe('endArray')
    })
  })

  describe('Paths', () => {
    test('tracks path for root object', () => {
      const parser = new PullParser('{"a":1}')
      const events = Array.from(parser.events())

      expect(events[0].path).toBe('$')
      expect(events[1].path).toBe('$')
      expect(events[2].path).toBe('$.a')
    })

    test('tracks path for nested object', () => {
      const parser = new PullParser('{"user":{"name":"Alice"}}')
      const events = Array.from(parser.events())

      expect(events[0].path).toBe('$')
      expect(events[1].path).toBe('$')
      expect(events[2].path).toBe('$.user')
      expect(events[3].path).toBe('$.user')
      expect(events[4].path).toBe('$.user.name')
    })

    test('tracks path for arrays', () => {
      const parser = new PullParser('[1,[2,3]]')
      const events = Array.from(parser.events())

      expect(events[0].path).toBe('$')
      expect(events[1].path).toBe('$[0]')
      expect(events[2].path).toBe('$[1]')
      expect(events[3].path).toBe('$[1][0]')
      expect(events[4].path).toBe('$[1][1]')
    })
  })

  describe('Number modes', () => {
    test('parses number in bigint mode', () => {
      const parser = new PullParser('9007199254740992', { numberMode: 'bigint' })
      const events = Array.from(parser.events())

      expect(events[0].value.kind).toBe('number')
      expect(events[0].value.bigInt).toBe(9007199254740992n)
    })

    test('parses number in decimal mode', () => {
      const parser = new PullParser('0.123456789123456789', { numberMode: 'decimal' })
      const events = Array.from(parser.events())

      expect(events[0].value.kind).toBe('number')
      expect(events[0].value.decimal).toBe('0.123456789123456789')
    })

    test('parses number in string mode', () => {
      const parser = new PullParser('42', { numberMode: 'string' })
      const events = Array.from(parser.events())

      expect(events[0].value.kind).toBe('number')
      expect(events[0].value.value).toBeUndefined()
      expect(events[0].value.raw).toBe('42')
    })
  })

  describe('Error handling', () => {
    test('throws on trailing comma in object', () => {
      expect(() => {
        const parser = new PullParser('{"a":1,}')
        Array.from(parser.events())
      }).toThrow(ParseError)
    })

    test('throws on trailing comma in array', () => {
      expect(() => {
        const parser = new PullParser('[1,2,]')
        Array.from(parser.events())
      }).toThrow(ParseError)
    })

    test('throws on missing colon', () => {
      expect(() => {
        const parser = new PullParser('{"a" 1}')
        Array.from(parser.events())
      }).toThrow(ParseError)
    })

    test('throws on missing comma', () => {
      expect(() => {
        const parser = new PullParser('{"a":1 "b":2}')
        Array.from(parser.events())
      }).toThrow(ParseError)
    })

    test('throws on extra data after value', () => {
      expect(() => {
        const parser = new PullParser('42 "extra"')
        Array.from(parser.events())
      }).toThrow(ParseError)
    })
  })

  describe('Limits', () => {
    test('respects maxDepth', () => {
      const nested = '{"a":{"b":{"c":1}}}'

      expect(() => {
        const parser = new PullParser(nested, { maxDepth: 2 })
        Array.from(parser.events())
      }).toThrow(ParseError)
      expect(() => {
        const parser = new PullParser(nested, { maxDepth: 2 })
        Array.from(parser.events())
      }).toThrow('Maximum depth')
    })

    test('respects maxKeyLength', () => {
      const longKey = 'a'.repeat(100)
      const json = `{"${longKey}":1}`

      expect(() => {
        const parser = new PullParser(json, { maxKeyLength: 50 })
        Array.from(parser.events())
      }).toThrow(ParseError)
      expect(() => {
        const parser = new PullParser(json, { maxKeyLength: 50 })
        Array.from(parser.events())
      }).toThrow('Key exceeds maximum length')
    })

    test('respects maxStringLength', () => {
      const longStr = 'a'.repeat(100)
      const json = `"${longStr}"`

      expect(() => {
        const parser = new PullParser(json, { maxStringLength: 50 })
        Array.from(parser.events())
      }).toThrow(ParseError)
      expect(() => {
        const parser = new PullParser(json, { maxStringLength: 50 })
        Array.from(parser.events())
      }).toThrow('String exceeds maximum length')
    })
  })

  describe('Factory function', () => {
    test('createPullParser creates parser instance', () => {
      const parser = createPullParser('42')
      expect(parser).toBeInstanceOf(PullParser)

      const events = Array.from(parser.events())
      expect(events[0].value.kind).toBe('number')
    })
  })

  describe('Real-world JSON', () => {
    test('parses package.json structure', () => {
      const json = `{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {
    "lib": "^2.0.0"
  }
}`
      const parser = new PullParser(json)
      const events = Array.from(parser.events())

      // Should successfully parse without errors
      expect(events[0].type).toBe('startObject')
      expect(events[events.length - 1].type).toBe('endObject')
    })

    test('parses array of objects', () => {
      const json = '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]'
      const parser = new PullParser(json)
      const events = Array.from(parser.events())

      expect(events[0].type).toBe('startArray')
      expect(events[events.length - 1].type).toBe('endArray')
    })
  })
})
