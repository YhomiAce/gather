import { Marked, type Tokens } from 'marked'

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

const SAFE_URL = /^(https?:|mailto:)/i

const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    // Raw HTML in descriptions is shown as text, never rendered.
    html({ text }: Tokens.HTML | Tokens.Tag): string {
      return escapeHtml(text)
    },
    link({ href, title, tokens }: Tokens.Link): string {
      const text = this.parser.parseInline(tokens)
      if (!SAFE_URL.test(href)) return text
      const t = title ? ` title="${escapeHtml(title)}"` : ''
      return `<a href="${escapeHtml(href)}"${t} rel="noopener nofollow ugc" target="_blank">${text}</a>`
    },
    image({ text }: Tokens.Image): string {
      return escapeHtml(text)
    },
  },
})

/**
 * Renders host-written markdown to HTML that is safe to inject with `v-html`:
 * raw HTML and images are dropped and only http(s)/mailto links survive.
 */
export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false })
}

/**
 * Plain-text summary of markdown for meta descriptions.
 */
export function markdownToPlainText(source: string, maxLength = 200): string {
  const text = source
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text
}
