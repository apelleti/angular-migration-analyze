const createChalkMock = () => {
  const createChainableStyle = () => {
    const style = jest.fn(str => str);
    style.bold = jest.fn(str => str);
    style.italic = jest.fn(str => str);
    style.underline = jest.fn(str => str);
    return style;
  };

  const chalk = {
    // Colors with chainable styles
    red: createChainableStyle(),
    green: createChainableStyle(),
    blue: createChainableStyle(),
    yellow: createChainableStyle(),
    gray: createChainableStyle(),
    white: createChainableStyle(),
    cyan: createChainableStyle(),
    
    // Styles
    bold: jest.fn(str => str),
    italic: jest.fn(str => str),
    underline: jest.fn(str => str)
  };
  
  return chalk;
};

const chalk = createChalkMock();
module.exports = chalk;
module.exports.default = chalk;