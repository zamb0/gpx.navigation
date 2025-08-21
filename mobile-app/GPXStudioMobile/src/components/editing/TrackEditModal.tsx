import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { TrackEditData } from '../../types/editing';
import { theme } from '../../constants';

interface TrackEditModalProps {
  visible: boolean;
  track?: any; // Existing track for editing
  onClose: () => void;
  onSave: (trackData: Partial<TrackEditData>) => void;
}

const PRESET_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
  '#000000', // Black
];

export const TrackEditModal: React.FC<TrackEditModalProps> = ({
  visible,
  track,
  onClose,
  onSave,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [color, setColor] = useState('#FF0000');
  const [width, setWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);

  // Initialize form with track data
  useEffect(() => {
    if (track) {
      setName(track.name || '');
      setDescription(track.desc || '');
      setComment(track.cmt || '');
      setColor(track.extensions?.line_style?.color || '#FF0000');
      setWidth(track.extensions?.line_style?.width || 3);
      setOpacity(track.extensions?.line_style?.opacity || 1);
    } else {
      // Reset form
      setName('');
      setDescription('');
      setComment('');
      setColor('#FF0000');
      setWidth(3);
      setOpacity(1);
    }
  }, [track, visible]);

  const handleSave = () => {
    const trackData: Partial<TrackEditData> = {
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      comment: comment.trim() || undefined,
      color: color,
      width: width,
      opacity: opacity,
    };

    try {
      onSave(trackData);
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save track'
      );
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const ColorPicker = () => (
    <View style={styles.colorPicker}>
      <View style={styles.colorGrid}>
        {PRESET_COLORS.map((presetColor) => (
          <TouchableOpacity
            key={presetColor}
            style={[
              styles.colorSwatch,
              { backgroundColor: presetColor },
              color === presetColor && styles.selectedColorSwatch,
            ]}
            onPress={() => setColor(presetColor)}
          >
            {color === presetColor && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.customColorSection}>
        <Text style={styles.label}>Custom Color</Text>
        <View style={styles.customColorRow}>
          <View style={[styles.colorPreview, { backgroundColor: color }]} />
          <TextInput
            style={styles.colorInput}
            value={color}
            onChangeText={setColor}
            placeholder="#FF0000"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="characters"
          />
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Track</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter track name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Comment</Text>
              <TextInput
                style={styles.textInput}
                value={comment}
                onChangeText={setComment}
                placeholder="Enter comment"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Styling */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <ColorPicker />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Width: {width}px</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={width}
                onValueChange={setWidth}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>1px</Text>
                <Text style={styles.sliderLabel}>10px</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Opacity: {Math.round(opacity * 100)}%
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0.1}
                maximumValue={1}
                step={0.1}
                value={opacity}
                onValueChange={setOpacity}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.border}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>10%</Text>
                <Text style={styles.sliderLabel}>100%</Text>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preview</Text>
              <View style={styles.previewContainer}>
                <View
                  style={[
                    styles.previewLine,
                    {
                      backgroundColor: color,
                      height: width,
                      opacity: opacity,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Statistics (if available) */}
          {track && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Segments</Text>
                  <Text style={styles.statValue}>
                    {track.segments?.length || 0}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Points</Text>
                  <Text style={styles.statValue}>
                    {track.segments?.reduce(
                      (total: number, seg: any) =>
                        total + (seg.points?.length || 0),
                      0
                    ) || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  saveText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    marginTop: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorSwatch: {
    borderColor: theme.colors.text,
    borderWidth: 3,
  },
  customColorSection: {
    marginTop: 8,
  },
  customColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: theme.colors.primary,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  previewContainer: {
    height: 60,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewLine: {
    width: '80%',
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
