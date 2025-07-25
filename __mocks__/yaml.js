module.exports = {
  parse: jest.fn((content) => {
    // Simple mock for pnpm-lock.yaml
    return {
      lockfileVersion: '5.4',
      importers: {
        '.': {
          dependencies: {},
          devDependencies: {}
        }
      },
      packages: {}
    };
  }),
  stringify: jest.fn((obj) => JSON.stringify(obj, null, 2))
};