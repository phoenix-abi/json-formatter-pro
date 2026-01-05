import { JSDOM } from 'jsdom'
import { getResult, MAX_LENGTH, type Result } from '../../src/lib/getResult'
import fg from 'fast-glob'
import { promises as fs } from 'node:fs'
import { expect, test } from 'vitest'

const UPDATE_SNAPSHOTS = process.env.UPDATE_SNAPSHOTS != null

const EXPECTED_COMMENT_REGEX = /<!--\s*EXPECT\s+(?<expected>[\s\S]+?)-->/

test('getResult', async () => {
  const files = await fg('./tests/fixtures/*.html', { dot: false, onlyFiles: true })

  for (const path of files) {
    try {
      const rawHtml = await fs.readFile(path, 'utf8')
      const commentMatch = rawHtml.match(EXPECTED_COMMENT_REGEX)

      const html = rawHtml.replaceAll('{{VERY_LONG_STRING}}', () => 'A'.repeat(MAX_LENGTH + 1))
      const jsdom = new JSDOM(html, { url: 'https://example.test' })
      const { document, HTMLElement } = jsdom.window

      // patch `checkVisibility`, which is not implemented in JSDOM
      HTMLElement.prototype.checkVisibility = function () {
        return !this.hidden && this.style.display !== 'none'
      }

      const actual = getResult(document)

      let expected: Partial<Result> = {}

      if (UPDATE_SNAPSHOTS) {
        const serialized = JSON.stringify(actual, null, 2)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')
        const expectedComment = `<!--\n  EXPECT ${serialized.trimStart()}\n-->`
        const newHtml = commentMatch == null
          ? `${expectedComment}\n${rawHtml}`
          : rawHtml.replace(EXPECTED_COMMENT_REGEX, expectedComment)

        await fs.writeFile(path, newHtml, 'utf8')
      } else {
        if (!commentMatch || !commentMatch.groups || !commentMatch.groups.expected) {
          throw new Error(`Missing EXPECT comment in fixture: ${path}`)
        }
        expected = JSON.parse(commentMatch.groups.expected)
      }

      expect(actual).toMatchObject(expected)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error in fixture', path, e)
      throw e
    }
  }
})
