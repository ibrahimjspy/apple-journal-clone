import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const { Text } = require('react-native');
    return <Text>{`Redirect to ${href}`}</Text>;
  },
}));

import Index from '../app/index';

describe('Index (entry point)', () => {
  it('redirects to home', () => {
    const { getByText } = render(<Index />);
    expect(getByText('Redirect to /home')).toBeTruthy();
  });
});
