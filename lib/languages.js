const labels = {
  en: {
    footer: '{number} message{s}', reply: 'Reply to a message', edited: '(edited)',
    file: 'File', embedImage: 'Embed image', thumbnail: 'Thumbnail',
    notArchived: 'Not archived. The original link may still work.'
  },
  es: {
    footer: '{number} mensaje{s}', reply: 'Respuesta a un mensaje', edited: '(editado)',
    file: 'Archivo', embedImage: 'Imagen del embed', thumbnail: 'Miniatura',
    notArchived: 'No archivado. El enlace original podría seguir disponible.'
  }
};

function labelsFor(language) {
  if (!Object.hasOwn(labels, language) || typeof language !== 'string') {
    throw new RangeError('Unsupported transcript language. Use "en" or "es".');
  }
  return labels[language];
}

module.exports = { labelsFor };
