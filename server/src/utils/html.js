// Tiny HTML escape for safely interpolating user-supplied text into HTML
// email bodies. Not a sanitiser — only for text-node content, never for
// attribute values that could carry javascript: URLs etc.

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
