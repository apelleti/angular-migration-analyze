const inquirer = {
  prompt: jest.fn(() => Promise.resolve({
    selectedFixes: []
  }))
};

module.exports = inquirer;
module.exports.default = inquirer;