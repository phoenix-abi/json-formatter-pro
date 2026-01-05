export const MAX_LENGTH = 3_000_000

export const isTooLong = (len: number, max: number = MAX_LENGTH): boolean => len > max

export const startsLikeJson = (text: string): boolean => {
  const [startChar] = text.match(/[^\x20\x0a\x0d\x09]/) ?? []
  return !!startChar && '{["'.includes(startChar)
}
