/**
 * Accessibility context for providing accessibility services throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import {
  useAccessibility,
  UseAccessibilityReturn,
} from '../hooks/useAccessibility';

const AccessibilityContext = createContext<UseAccessibilityReturn | undefined>(
  undefined
);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
}) => {
  const accessibility = useAccessibility();

  return (
    <AccessibilityContext.Provider value={accessibility}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibilityContext = (): UseAccessibilityReturn => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error(
      'useAccessibilityContext must be used within an AccessibilityProvider'
    );
  }
  return context;
};
