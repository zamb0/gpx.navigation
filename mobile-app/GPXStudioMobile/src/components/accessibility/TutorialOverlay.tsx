/**
 * Tutorial overlay component for contextual help and onboarding
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { TutorialService } from '../../services/accessibility/TutorialService';
import { AccessibilityThemeService } from '../../services/accessibility/AccessibilityThemeService';
import { AccessibleText } from './AccessibleText';
import { AccessibleButton } from './AccessibleButton';
import { TutorialStep } from '../../types/accessibility';

interface TutorialOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  visible,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [tutorialInfo, setTutorialInfo] = useState<{
    name: string;
    step: number;
    total: number;
  } | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const tutorialService = TutorialService.getInstance();
  const themeService = AccessibilityThemeService.getInstance();
  const theme = themeService.getTheme();

  useEffect(() => {
    if (visible) {
      updateTutorialState();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: themeService.getAnimationDuration(300),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: themeService.getAnimationDuration(200),
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const updateTutorialState = () => {
    const info = tutorialService.getCurrentTutorial();
    const step = tutorialService.getCurrentStep();

    setTutorialInfo(info);
    setCurrentStep(step);
  };

  const handleNext = () => {
    const hasNext = tutorialService.nextStep();
    if (hasNext) {
      updateTutorialState();
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    tutorialService.previousStep();
    updateTutorialState();
  };

  const handleSkip = () => {
    tutorialService.skipTutorial();
    onClose();
  };

  const handleSkipStep = () => {
    const skipped = tutorialService.skipStep();
    if (skipped) {
      updateTutorialState();
    }
  };

  const getOverlayPosition = () => {
    const { width, height } = Dimensions.get('window');

    if (!currentStep) return { top: height * 0.5, left: width * 0.5 };

    switch (currentStep.position) {
      case 'top':
        return { top: height * 0.2, left: width * 0.5 };
      case 'bottom':
        return { bottom: height * 0.2, left: width * 0.5 };
      case 'left':
        return { top: height * 0.5, left: width * 0.1 };
      case 'right':
        return { top: height * 0.5, right: width * 0.1 };
      case 'center':
      default:
        return { top: height * 0.5, left: width * 0.5 };
    }
  };

  if (!visible || !currentStep || !tutorialInfo) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.tutorialCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              opacity: fadeAnim,
              transform: [
                {
                  translateX: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
            getOverlayPosition(),
          ]}
        >
          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <AccessibleText
              variant="caption"
              color="secondary"
              accessibilityLabel={`Step ${tutorialInfo.step + 1} of ${tutorialInfo.total}`}
            >
              {tutorialInfo.step + 1} / {tutorialInfo.total}
            </AccessibleText>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${((tutorialInfo.step + 1) / tutorialInfo.total) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Step content */}
          <View style={styles.content}>
            <AccessibleText
              variant="heading3"
              accessibilityRole="header"
              style={styles.title}
            >
              {currentStep.title}
            </AccessibleText>

            <AccessibleText variant="body" style={styles.description}>
              {currentStep.description}
            </AccessibleText>

            {currentStep.action && currentStep.action !== 'none' && (
              <AccessibleText
                variant="caption"
                color="accent"
                style={styles.actionHint}
              >
                {getActionText(currentStep.action)}
              </AccessibleText>
            )}
          </View>

          {/* Navigation buttons */}
          <View style={styles.buttonContainer}>
            <View style={styles.leftButtons}>
              {tutorialInfo.step > 0 && (
                <AccessibleButton
                  title="Previous"
                  onPress={handlePrevious}
                  variant="text"
                  size="small"
                  accessibilityHint="Go to previous tutorial step"
                />
              )}

              {currentStep.skipable && (
                <AccessibleButton
                  title="Skip Step"
                  onPress={handleSkipStep}
                  variant="text"
                  size="small"
                  accessibilityHint="Skip this tutorial step"
                />
              )}
            </View>

            <View style={styles.rightButtons}>
              <AccessibleButton
                title="Skip Tutorial"
                onPress={handleSkip}
                variant="outline"
                size="small"
                accessibilityHint="Skip entire tutorial"
                style={styles.skipButton}
              />

              <AccessibleButton
                title={
                  tutorialInfo.step + 1 === tutorialInfo.total
                    ? 'Finish'
                    : 'Next'
                }
                onPress={handleNext}
                variant="primary"
                size="small"
                accessibilityHint={
                  tutorialInfo.step + 1 === tutorialInfo.total
                    ? 'Finish tutorial'
                    : 'Go to next tutorial step'
                }
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getActionText = (action: string): string => {
  switch (action) {
    case 'tap':
      return 'Tap to continue';
    case 'swipe':
      return 'Swipe to continue';
    case 'longPress':
      return 'Long press to continue';
    default:
      return '';
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialCard: {
    maxWidth: 320,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
  },
  actionHint: {
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    marginRight: 8,
  },
});
