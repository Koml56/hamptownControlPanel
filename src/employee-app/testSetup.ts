// Setup global mocks for IndexedDB in Jest environment
const mockObjectStore = {
  add: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(() => ({ onsuccess: null, result: null })),
  getAll: jest.fn(() => ({ onsuccess: null, result: [] })),
  put: jest.fn()
};

const mockTransaction = {
  objectStore: jest.fn(() => mockObjectStore),
  oncomplete: null,
  onerror: null,
  onabort: null
};

const mockDatabase = {
  objectStoreNames: {
    contains: jest.fn(() => false)
  },
  createObjectStore: jest.fn(() => mockObjectStore),
  transaction: jest.fn(() => mockTransaction),
  close: jest.fn()
};

const mockRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockDatabase
};

// Mock IndexedDB globally
global.indexedDB = {
  open: jest.fn(() => {
    const request = { ...mockRequest };
    // Trigger success immediately in tests
    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);
    return request;
  }),
  deleteDatabase: jest.fn(),
  cmp: jest.fn()
} as any;

export {};