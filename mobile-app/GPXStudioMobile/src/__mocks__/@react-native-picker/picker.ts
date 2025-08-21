/**
 * Mock for @react-native-picker/picker
 */

import React from 'react';

export const Picker = {
  Item: ({ label, value }: { label: string; value: any }) =>
    React.createElement('option', { value }, label),
};

export default {
  Picker,
};
