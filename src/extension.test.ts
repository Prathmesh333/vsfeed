import * as vscode from 'vscode';

// Simple smoke test to verify extension structure
describe('Extension Integration Tests', () => {
  test('extension exports activate function', () => {
    const extension = require('./extension');
    expect(extension.activate).toBeDefined();
    expect(typeof extension.activate).toBe('function');
  });

  test('extension exports deactivate function', () => {
    const extension = require('./extension');
    expect(extension.deactivate).toBeDefined();
    expect(typeof extension.deactivate).toBe('function');
  });

  test('extension module can be imported', () => {
    expect(() => {
      require('./extension');
    }).not.toThrow();
  });
});
