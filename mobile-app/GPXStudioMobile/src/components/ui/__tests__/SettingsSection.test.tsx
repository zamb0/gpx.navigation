import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SettingsSection } from '../SettingsSection';

describe('SettingsSection', () => {
  it('renders title and children correctly', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section">
        <Text>Test Content</Text>
      </SettingsSection>
    );

    expect(getByText('Test Section')).toBeTruthy();
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies correct styles', () => {
    const { getByText } = render(
      <SettingsSection title="Test Section">
        <Text>Test Content</Text>
      </SettingsSection>
    );

    const title = getByText('Test Section');
    expect(title.props.style).toMatchObject({
      fontSize: 18,
      fontWeight: '700',
    });
  });
});
