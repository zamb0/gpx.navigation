import React from 'react';
import { View } from 'react-native';

export default React.forwardRef((props: any, ref: any) => {
  return React.createElement(View, { ...props, ref, testID: 'slider' });
});
