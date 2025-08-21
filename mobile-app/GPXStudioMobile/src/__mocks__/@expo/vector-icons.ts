import React from 'react';
import { Text } from 'react-native';

// Mock all icon components from @expo/vector-icons
export const Ionicons = ({ name, size, color, style, ...props }: any) =>
  React.createElement(
    Text,
    {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `ionicon-${name}`,
    },
    name
  );

export const AntDesign = ({ name, size, color, style, ...props }: any) =>
  React.createElement(
    Text,
    {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `antdesign-${name}`,
    },
    name
  );

export const MaterialIcons = ({ name, size, color, style, ...props }: any) =>
  React.createElement(
    Text,
    {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `materialicon-${name}`,
    },
    name
  );

export const Feather = ({ name, size, color, style, ...props }: any) =>
  React.createElement(
    Text,
    {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `feather-${name}`,
    },
    name
  );

export const FontAwesome = ({ name, size, color, style, ...props }: any) =>
  React.createElement(
    Text,
    {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `fontawesome-${name}`,
    },
    name
  );

export const MaterialCommunityIcons = ({
  name,
  size,
  color,
  style,
  ...props
}: any) =>
  React.createElement(
    Text,
    {
      ...props,
      style: [{ fontSize: size, color }, style],
      testID: `materialcommunity-${name}`,
    },
    name
  );

export default {
  Ionicons,
  AntDesign,
  MaterialIcons,
  Feather,
  FontAwesome,
  MaterialCommunityIcons,
};
