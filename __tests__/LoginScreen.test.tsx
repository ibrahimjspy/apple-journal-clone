import { render, screen, fireEvent } from '@testing-library/react-native';

// Mock expo modules
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [null, null, jest.fn()],
}));

jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Import after mocks
import LoginScreen from '../app/index';

describe('LoginScreen', () => {
  it('renders the title correctly', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Journal')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<LoginScreen />);
    expect(screen.getByText(/Capture your thoughts/)).toBeTruthy();
  });

  it('renders feature items', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Write your story')).toBeTruthy();
    expect(screen.getByText('Voice journaling')).toBeTruthy();
    expect(screen.getByText('Add photos')).toBeTruthy();
    expect(screen.getByText('Synced to your Drive')).toBeTruthy();
  });

  it('renders the Google login button', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Continue with Google')).toBeTruthy();
  });

  it('renders privacy note', () => {
    render(<LoginScreen />);
    expect(screen.getByText(/Your journals are stored securely/)).toBeTruthy();
  });
});

