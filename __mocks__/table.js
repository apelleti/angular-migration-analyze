const table = jest.fn((data) => {
  // Simple mock that returns a string representation
  if (Array.isArray(data)) {
    return data.map(row => row.join(' | ')).join('\n');
  }
  return '';
});

module.exports = { table };
module.exports.default = { table };