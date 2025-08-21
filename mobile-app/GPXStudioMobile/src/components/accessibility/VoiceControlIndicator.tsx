/**
 * Voice control indicator component showing voice control status
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { VoiceControlService } from '../../services/accessibility/VoiceControlService';
import { AccessibilityThemeService } from '../../services/accessibility/AccessibilityThemeService';
import { AccessibleText } from './AccessibleText';

interface VoiceControlIndicatorProps {
  visible?: boolean;
  position?: 'top' | 'bottom';
}

export const VoiceControlIndicator: React.FC<VoiceControlIndicatorProps> = ({
  visible = true,
  position = 'top',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(-50));

  const voiceControlService = VoiceControlService.getInstance();
  const themeService = AccessibilityThemeService.getInstance();
  const theme = themeService.getTheme();

  useEffect(() => {
    // Check initial state
    setIsListening(voiceControlService.isVoiceControlActive());

    // Set up polling to check voice control status
    const interval = setInterval(() => {
      const listening = voiceControlService.isVoiceControlActive();
      setIsListening(listening);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isListening && visible) {
      // Slide in animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: themeService.getAnimationDuration(300),
        useNativeDriver: true,
      }).start();

      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: themeService.getAnimationDuration(800),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: themeService.getAnimationDuration(800),
            useNativeDriver: true,
          }),
        ])
      );

      if (!themeService.shouldReduceMotion()) {
        pulseAnimation.start();
      }

      return () => {
        pulseAnimation.stop();
      };
    } else {
      // Slide out animation
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -50 : 50,
        duration: themeService.getAnimationDuration(200),
        useNativeDriver: true,
      }).start();
    }
  }, [isListening, visible]);

  if (!visible || !isListening) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.border,
          [position]: 0,
          transform: [
            {
              translateY: slideAnim,
            },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: theme.colors.accent,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      <AccessibleText
        variant="caption"
        color="primary"
        style={[styles.text, { color: theme.colors.background }]}
        accessibilityLabel="Voice control is active and listening for commands"
      >
        Voice Control Active
      </AccessibleText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
  },
});
