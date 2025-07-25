const EventEmitter = require('events');

class MockIncomingMessage extends EventEmitter {
  constructor(statusCode = 200, data = '{}') {
    super();
    this.statusCode = statusCode;
    this.statusMessage = statusCode === 200 ? 'OK' : 'Error';
    this.headers = {};
    this._data = data;
  }
}

class MockRequest extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
  }

  end() {
    return this;
  }

  write() {
    return this;
  }

  destroy() {
    this.destroyed = true;
    this.emit('error', new Error('Request destroyed'));
  }

  setTimeout() {
    return this;
  }
}

// Default mock data
let mockResponseData = JSON.stringify({
  name: 'test-package',
  'dist-tags': { latest: '1.0.0' },
  versions: {
    '1.0.0': {
      name: 'test-package',
      version: '1.0.0',
      dependencies: {}
    }
  }
});

let mockStatusCode = 200;

const https = {
  get: jest.fn((options, callback) => {
    const req = new MockRequest();
    const res = new MockIncomingMessage(mockStatusCode, mockResponseData);
    
    process.nextTick(() => {
      if (callback) callback(res);
      process.nextTick(() => {
        res.emit('data', mockResponseData);
        res.emit('end');
      });
    });
    
    return req;
  }),
  
  request: jest.fn((options, callback) => {
    const req = new MockRequest();
    
    process.nextTick(() => {
      const res = new MockIncomingMessage(mockStatusCode, mockResponseData);
      if (callback) callback(res);
      process.nextTick(() => {
        res.emit('data', mockResponseData);
        res.emit('end');
      });
    });
    
    return req;
  }),
  
  // Helper methods for tests
  __setMockResponseData: (data) => {
    mockResponseData = typeof data === 'string' ? data : JSON.stringify(data);
  },
  
  __setMockStatusCode: (code) => {
    mockStatusCode = code;
  },
  
  __resetMock: () => {
    mockResponseData = JSON.stringify({
      name: 'test-package',
      'dist-tags': { latest: '1.0.0' },
      versions: {
        '1.0.0': {
          name: 'test-package',
          version: '1.0.0',
          dependencies: {}
        }
      }
    });
    mockStatusCode = 200;
  }
};

module.exports = https;