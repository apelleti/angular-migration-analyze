const ora = jest.fn(() => {
  const spinner = {
    start: jest.fn(function() { return this; }),
    stop: jest.fn(function() { return this; }),
    succeed: jest.fn(function() { return this; }),
    fail: jest.fn(function() { return this; }),
    warn: jest.fn(function() { return this; }),
    info: jest.fn(function() { return this; }),
    text: '',
    isSpinning: false
  };
  
  // Make methods chainable
  Object.keys(spinner).forEach(key => {
    if (typeof spinner[key] === 'function') {
      spinner[key] = spinner[key].bind(spinner);
    }
  });
  
  return spinner;
});

module.exports = ora;
module.exports.default = ora;