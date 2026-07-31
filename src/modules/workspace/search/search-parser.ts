export type SearchModifier = {
  type: "in" | "from" | "has" | "before" | "after" | "is"
  value: string
}

export type ParsedSearchQuery = {
  raw: string
  text: string
  modifiers: SearchModifier[]
  excludedTerms: string[]
  phrases: string[]
}

const MODIFIER_RE = /\b(in|from|has|before|after|is):([^\s"]+|"[^"]*")/gi

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const modifiers: SearchModifier[] = []
  const consumed = new Set<number>()
  let match: RegExpExecArray | null

  while ((match = MODIFIER_RE.exec(raw))) {
    const start = match.index
    const end = start + match[0].length
    for (let i = start; i < end; i += 1) consumed.add(i)
    modifiers.push({
      type: match[1].toLowerCase() as SearchModifier["type"],
      value: match[2].replace(/^"|"$/g, ""),
    })
  }

  const remainder = raw
    .split("")
    .map((char, index) => (consumed.has(index) ? " " : char))
    .join("")
    .trim()

  const phrases = [...remainder.matchAll(/"([^"]+)"/g)].map((m) => m[1])
  const unquoted = remainder.replace(/"([^"]+)"/g, " ")
  const excludedTerms = (unquoted.match(/-(\S+)/g) ?? []).map((term) =>
    term.slice(1),
  )
  const text = unquoted.replace(/-(\S+)/g, " ").replace(/\s+/g, " ").trim()

  return {
    raw,
    text,
    modifiers,
    excludedTerms,
    phrases,
  }
}
