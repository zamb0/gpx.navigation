import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Navigation state interface
export interface NavigationState {
  activeTab: string;
  previousTab: string | null;
  navigationHistory: string[];
  deepLinkData: Record<string, any> | null;
}

// Navigation actions
export type NavigationAction =
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_DEEP_LINK_DATA'; payload: Record<string, any> | null }
  | { type: 'CLEAR_DEEP_LINK_DATA' }
  | { type: 'ADD_TO_HISTORY'; payload: string };

// Initial state
const initialState: NavigationState = {
  activeTab: 'map',
  previousTab: null,
  navigationHistory: ['map'],
  deepLinkData: null,
};

// Navigation reducer
function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        previousTab: state.activeTab,
        activeTab: action.payload,
      };
    case 'SET_DEEP_LINK_DATA':
      return {
        ...state,
        deepLinkData: action.payload,
      };
    case 'CLEAR_DEEP_LINK_DATA':
      return {
        ...state,
        deepLinkData: null,
      };
    case 'ADD_TO_HISTORY':
      return {
        ...state,
        navigationHistory: [...state.navigationHistory, action.payload].slice(
          -10
        ), // Keep last 10 entries
      };
    default:
      return state;
  }
}

// Context interface
interface NavigationContextType {
  state: NavigationState;
  dispatch: React.Dispatch<NavigationAction>;
  setActiveTab: (tab: string) => void;
  setDeepLinkData: (data: Record<string, any> | null) => void;
  clearDeepLinkData: () => void;
  addToHistory: (route: string) => void;
}

// Create context
const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

// Provider component
interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, dispatch] = useReducer(navigationReducer, initialState);

  const setActiveTab = React.useCallback((tab: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });
  }, []);

  const setDeepLinkData = React.useCallback(
    (data: Record<string, any> | null) => {
      dispatch({ type: 'SET_DEEP_LINK_DATA', payload: data });
    },
    []
  );

  const clearDeepLinkData = React.useCallback(() => {
    dispatch({ type: 'CLEAR_DEEP_LINK_DATA' });
  }, []);

  const addToHistory = React.useCallback((route: string) => {
    dispatch({ type: 'ADD_TO_HISTORY', payload: route });
  }, []);

  const value: NavigationContextType = React.useMemo(
    () => ({
      state,
      dispatch,
      setActiveTab,
      setDeepLinkData,
      clearDeepLinkData,
      addToHistory,
    }),
    [state, setActiveTab, setDeepLinkData, clearDeepLinkData, addToHistory]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// Hook to use navigation context
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

// Hook for deep linking
export function useDeepLink() {
  const { state, clearDeepLinkData } = useNavigation();

  return {
    deepLinkData: state.deepLinkData,
    clearDeepLinkData,
  };
}
