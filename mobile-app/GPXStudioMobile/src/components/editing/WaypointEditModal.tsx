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
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import {
  WaypointEditData,
  WAYPOINT_SYMBOLS,
  WaypointSymbol,
} from '../../types/editing';
import { useEditing } from '../../context/EditingContext';
import { theme } from '../../constants';

interface WaypointEditModalProps {
  visible: boolean;
  waypoint?: any; // Existing waypoint for editing, null for new waypoint
  initialPosition?: { latitude: number; longitude: number; elevation?: number };
  onClose: () => void;
  onSave: (waypointData: WaypointEditData) => void;
}

export const WaypointEditModal: React.FC<WaypointEditModalProps> = ({
  visible,
  waypoint,
  initialPosition,
  onClose,
  onSave,
}) => {
  const { validateCurrentFile } = useEditing();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [symbol, setSymbol] = useState<WaypointSymbol>('Waypoint');
  const [type, setType] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [elevation, setElevation] = useState('');

  // Initialize form with waypoint data or initial position
  useEffect(() => {
    if (waypoint) {
      // Editing existing waypoint
      setName(waypoint.name || '');
      setDescription(waypoint.desc || '');
      setComment(waypoint.cmt || '');
      setSymbol(waypoint.sym || 'Waypoint');
      setType(waypoint.type || '');
      setLatitude(waypoint.lat?.toString() || '');
      setLongitude(waypoint.lon?.toString() || '');
      setElevation(waypoint.ele?.toString() || '');
    } else if (initialPosition) {
      // Creating new waypoint
      setName('');
      setDescription('');
      setComment('');
      setSymbol('Waypoint');
      setType('');
      setLatitude(initialPosition.latitude.toString());
      setLongitude(initialPosition.longitude.toString());
      setElevation(initialPosition.elevation?.toString() || '');
    } else {
      // Reset form
      setName('');
      setDescription('');
      setComment('');
      setSymbol('Waypoint');
      setType('');
      setLatitude('');
      setLongitude('');
      setElevation('');
    }
  }, [waypoint, initialPosition, visible]);

  const handleSave = () => {
    // Validate required fields
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Latitude and longitude are required');
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const ele = elevation ? parseFloat(elevation) : undefined;

    // Validate coordinate ranges
    if (isNaN(lat) || lat < -90 || lat > 90) {
      Alert.alert('Error', 'Latitude must be between -90 and 90 degrees');
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      Alert.alert('Error', 'Longitude must be between -180 and 180 degrees');
      return;
    }

    if (elevation && isNaN(ele!)) {
      Alert.alert('Error', 'Elevation must be a valid number');
      return;
    }

    const waypointData: WaypointEditData = {
      latitude: lat,
      longitude: lon,
      elevation: ele,
      name: name.trim() || undefined,
      description: description.trim() || undefined,
      comment: comment.trim() || undefined,
      symbol: symbol,
      type: type.trim() || undefined,
    };

    try {
      onSave(waypointData);
      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save waypoint'
      );
    }
  };

  const handleCancel = () => {
    onClose();
  };

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
          <Text style={styles.title}>
            {waypoint ? 'Edit Waypoint' : 'New Waypoint'}
          </Text>
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
                placeholder="Enter waypoint name"
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

          {/* Classification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Classification</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Symbol</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={symbol}
                  onValueChange={setSymbol}
                  style={styles.picker}
                >
                  {WAYPOINT_SYMBOLS.map((sym) => (
                    <Picker.Item key={sym} label={sym} value={sym} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.textInput}
                value={type}
                onChangeText={setType}
                placeholder="Enter waypoint type"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
          </View>

          {/* Coordinates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Coordinates</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Latitude *</Text>
              <TextInput
                style={styles.textInput}
                value={latitude}
                onChangeText={setLatitude}
                placeholder="0.000000"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Longitude *</Text>
              <TextInput
                style={styles.textInput}
                value={longitude}
                onChangeText={setLongitude}
                placeholder="0.000000"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Elevation (m)</Text>
              <TextInput
                style={styles.textInput}
                value={elevation}
                onChangeText={setElevation}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              * Required fields. Coordinates should be in decimal degrees
              format.
            </Text>
          </View>
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  picker: {
    height: 50,
    color: theme.colors.text,
  },
  helpSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  helpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});
