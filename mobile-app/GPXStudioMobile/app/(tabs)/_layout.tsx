import { Tabs, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useNavigation } from '../../src/context';
import { theme } from '../../src/constants';
import { TAB_CONFIGS } from '../../src/types/navigation';

export default function TabLayout() {
  const segments = useSegments();
  const { state, setActiveTab, addToHistory } = useNavigation();

  // Track tab changes for navigation context
  useEffect(() => {
    // Find the current tab from segments
    const tabSegment = segments.find((segment) =>
      ['map', 'files', 'record', 'settings'].includes(segment)
    );

    // Only update if the tab has actually changed
    if (tabSegment && tabSegment !== state.activeTab) {
      setActiveTab(tabSegment);
      addToHistory(tabSegment);
    }
  }, [segments, state.activeTab, setActiveTab, addToHistory]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 64,
          ...theme.shadows.sm,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.medium,
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
          ...theme.shadows.sm,
        },
        headerTitleStyle: {
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.headerText,
        },
        headerShadowVisible: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
    >
      {TAB_CONFIGS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            headerShown: tab.headerShown,
            tabBarIcon: ({ color, focused, size = 24 }) => (
              <Ionicons
                name={
                  focused ? (tab.iconNameFocused as any) : (tab.iconName as any)
                }
                color={color}
                size={size}
              />
            ),
            // Add accessibility labels
            tabBarAccessibilityLabel: `${tab.title} tab`,
          }}
        />
      ))}
    </Tabs>
  );
}
