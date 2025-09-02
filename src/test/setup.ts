import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import React from 'react';

// Mock Firebase
vi.mock('@/services/firebase', () => ({
  db: {},
  auth: {},
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useParams: () => ({}),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => {
    return React.createElement('a', { href: to }, children);
  },
}));

// Mock Auth Context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      name: 'Test User',
      email: 'test@example.com',
      role: 'Admin',
      hasErpAccess: true,
      hasPayrollAccess: true,
      hasProjectsAccess: true,
    },
  }),
}));

// Mock permissions
vi.mock('@/utils/permissions', () => ({
  canPerformAction: () => true,
}));

// Mock hooks
vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    searchInputRef: { current: null },
  }),
}));

vi.mock('@/hooks/useSearchableList', () => ({
  useSearchableList: () => ({
    filteredItems: [],
    selectedIndex: -1,
    showResults: false,
    handleInputFocus: vi.fn(),
    handleInputChange: vi.fn(),
    selectItem: vi.fn(),
  }),
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

// Global test cleanup
afterEach(() => {
  vi.clearAllMocks();
});

beforeAll(() => {
  // Mock window functions
  Object.defineProperty(window, 'confirm', {
    value: vi.fn(() => true),
  });
  
  Object.defineProperty(window, 'alert', {
    value: vi.fn(),
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});