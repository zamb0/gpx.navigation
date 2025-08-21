import { useEffect, useState } from 'react';
import { useNavigation } from '../context';
import { TabParamList } from '../types/navigation';

// Hook for managing navigation state in components
export function useNavigationState() {
  const { state, setActiveTab, addToHistory } = useNavigation();
  const [isNavigating, setIsNavigating] = useState(false);

  // Navigate to a specific tab
  const navigateToTab = (tab: keyof TabParamList) => {
    setIsNavigating(true);
    setActiveTab(tab);
    addToHistory(tab);

    // Reset navigation state after a short delay
    setTimeout(() => {
      setIsNavigating(false);
    }, 300);
  };

  // Get navigation history
  const getNavigationHistory = () => {
    return state.navigationHistory;
  };

  // Check if a tab is active
  const isTabActive = (tab: keyof TabParamList) => {
    return state.activeTab === tab;
  };

  // Get previous tab
  const getPreviousTab = () => {
    return state.previousTab;
  };

  // Go back to previous tab
  const goBackToPreviousTab = () => {
    if (state.previousTab) {
      navigateToTab(state.previousTab as keyof TabParamList);
    }
  };

  return {
    activeTab: state.activeTab,
    previousTab: state.previousTab,
    navigationHistory: state.navigationHistory,
    deepLinkData: state.deepLinkData,
    isNavigating,
    navigateToTab,
    getNavigationHistory,
    isTabActive,
    getPreviousTab,
    goBackToPreviousTab,
  };
}

// Hook for handling tab-specific navigation logic
export function useTabNavigation(tabName: keyof TabParamList) {
  const { state } = useNavigation();
  const [isActive, setIsActive] = useState(false);
  const [wasJustActivated, setWasJustActivated] = useState(false);

  useEffect(() => {
    const newIsActive = state.activeTab === tabName;

    // Detect when tab becomes active
    if (newIsActive && !isActive) {
      setWasJustActivated(true);
      setTimeout(() => setWasJustActivated(false), 500);
    }

    setIsActive(newIsActive);
  }, [state.activeTab, tabName, isActive]);

  return {
    isActive,
    wasJustActivated,
    isInHistory: state.navigationHistory.includes(tabName),
  };
}
