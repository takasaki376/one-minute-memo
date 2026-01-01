import '@testing-library/jest-dom';
import { vi } from 'vitest';

const createMockCanvasContext = () => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  drawImage: vi.fn(),
  lineJoin: '',
  lineCap: '',
  lineWidth: 0,
  strokeStyle: '',
  fillStyle: '',
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => createMockCanvasContext()),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn(() => 'data:image/png;base64,'),
});
