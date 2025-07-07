// Monkey patch para desabilitar link preview no Baileys
// Isso resolve o erro "Cannot find module 'link-preview-js'"

const originalRequire = require;

require = function(id) {
  if (id === 'link-preview-js') {
    // Retorna um mock simples quando link-preview-js é requerido
    return {
      getLinkPreview: () => Promise.resolve(null)
    };
  }
  return originalRequire.apply(this, arguments);
};

module.exports = {};
