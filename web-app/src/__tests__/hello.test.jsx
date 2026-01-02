const { describe, it, expect } = require('vitest');

describe('Hello World Test', () => {
    it('should return hello world', () => {
        expect('hello world').toBe('hello world');
    });
});