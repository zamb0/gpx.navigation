import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EditingMode } from '../../types/editing';
import { useEditing } from '../../context/EditingContext';
import { theme } from '../../constants';

interface EditingToolbarProps {
  visible: boolean;
  onClose: () => void;
}

export const EditingToolbar: React.FC<EditingToolbarProps> = ({
  visible,
  onClose,
}) => {
  const {
    mode,
    setMode,
    canUndo,
    canRedo,
    undo,
    redo,
    clearSelection,
    selection,
    validateCurrentFile,
  } = useEditing();

  if (!visible) {
    return null;
  }

  const handleModeChange = (newMode: EditingMode) => {
    if (mode === newMode) {
      setMode('none');
      clearSelection();
    } else {
      setMode(newMode);
      clearSelection();
    }
  };

  const handleValidate = () => {
    const result = validateCurrentFile();
    // You could show a modal or alert with validation results
    console.log('Validation result:', result);
  };

  const getSelectionCount = () => {
    return (
      selection.selectedWaypoints.length +
      selection.selectedTrackPoints.length +
      selection.selectedTracks.length
    );
  };

  return (
    <View style={styles.container}>
      {/* Mode Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mode</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'select' && styles.activeModeButton,
            ]}
            onPress={() => handleModeChange('select')}
          >
            <Ionicons
              name="hand-left-outline"
              size={20}
              color={
                mode === 'select' ? theme.colors.background : theme.colors.text
              }
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'select' && styles.activeModeButtonText,
              ]}
            >
              Select
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'waypoint' && styles.activeModeButton,
            ]}
            onPress={() => handleModeChange('waypoint')}
          >
            <Ionicons
              name="location-outline"
              size={20}
              color={
                mode === 'waypoint'
                  ? theme.colors.background
                  : theme.colors.text
              }
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'waypoint' && styles.activeModeButtonText,
              ]}
            >
              Waypoint
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'track' && styles.activeModeButton,
            ]}
            onPress={() => handleModeChange('track')}
          >
            <Ionicons
              name="trail-sign-outline"
              size={20}
              color={
                mode === 'track' ? theme.colors.background : theme.colors.text
              }
            />
            <Text
              style={[
                styles.modeButtonText,
                mode === 'track' && styles.activeModeButtonText,
              ]}
            >
              Track
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Undo/Redo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, !canUndo && styles.disabledButton]}
            onPress={undo}
            disabled={!canUndo}
          >
            <Ionicons
              name="arrow-undo-outline"
              size={20}
              color={canUndo ? theme.colors.text : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.actionButtonText,
                !canUndo && styles.disabledButtonText,
              ]}
            >
              Undo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, !canRedo && styles.disabledButton]}
            onPress={redo}
            disabled={!canRedo}
          >
            <Ionicons
              name="arrow-redo-outline"
              size={20}
              color={canRedo ? theme.colors.text : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.actionButtonText,
                !canRedo && styles.disabledButtonText,
              ]}
            >
              Redo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selection Info */}
      {getSelectionCount() > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Selected: {getSelectionCount()} item
            {getSelectionCount() !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={clearSelection}
          >
            <Ionicons
              name="close-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleValidate}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.actionButtonText}>Validate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onClose}>
            <Ionicons
              name="close-outline"
              size={20}
              color={theme.colors.text}
            />
            <Text style={styles.actionButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 10,
    right: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    minWidth: 80,
  },
  activeModeButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modeButtonText: {
    fontSize: 12,
    color: theme.colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  activeModeButtonText: {
    color: theme.colors.background,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    minWidth: 70,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.text,
    marginLeft: 4,
    fontWeight: '500',
  },
  disabledButtonText: {
    color: theme.colors.textSecondary,
  },
});
