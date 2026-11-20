const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => entities[c]);
}
function https(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch { return null; }
}
function values(collection) {
  return collection?.values ? Array.from(collection.values()) : [];
}
module.exports = { escape, https, values };
