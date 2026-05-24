const { nanoid } = require('nanoid');

const generateSnippetId = () => {
  return nanoid(8);
};

const generateUserId = () => {
  return nanoid(12);
};

const generateVersionId = () => {
  return nanoid(10);
};

module.exports = {
  generateSnippetId,
  generateUserId,
  generateVersionId
};
