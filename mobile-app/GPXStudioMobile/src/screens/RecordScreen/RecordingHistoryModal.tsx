/**
 * Recording History Modal Component
 * Displays list of completed recording sessions with management options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { TrackingSessionsRepository } from '../../services/database/TrackingSessionsRepository';
import { TrackingSession } from '../../types';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
  formatElevation,
} from '../../utils/formatters';
import { theme } from '../../constants';

export interface RecordingHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onExportSession?: (session: TrackingSession) => void;
  onViewSession?: (session: TrackingSession) => void;
}

interface SessionListItem extends TrackingSession {
  formattedDate: string;
  formattedTime: string;
}

export const RecordingHistoryModal: React.FC<RecordingHistoryModalProps> = ({
  visible,
  onClose,
  onExportSession,
  onViewSession,
}) => {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const repository = new TrackingSessionsRepository();

  // Load sessions when modal opens
  useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible]);

  const loadSessions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const allSessions = await repository.getAllSessions();

      // Filter out active sessions and format data
      const completedSessions = allSessions
        .filter((session) => !session.isActive)
        .map((session) => ({
          ...session,
          formattedDate: session.startTime.toLocaleDateString(),
          formattedTime: session.startTime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }));

      setSessions(completedSessions);
    } catch (error) {
      console.error('Failed to load recording sessions:', error);
      Alert.alert('Error', 'Failed to load recording history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadSessions(true);
  };

  const handleDeleteSession = (session: TrackingSession) => {
    Alert.alert(
      'Delete Recording',
      `Are you sure you want to delete the recording from ${session.startTime.toLocaleDateString()}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await repository.deleteSession(session.id);
              await loadSessions();
              Alert.alert('Success', 'Recording deleted successfully.');
            } catch (error) {
              console.error('Failed to delete session:', error);
              Alert.alert('Error', 'Failed to delete recording.');
            }
          },
        },
      ]
    );
  };

  const handleSessionPress = (session: TrackingSession) => {
    if (selectedSession === session.id) {
      setSelectedSession(null);
    } else {
      setSelectedSession(session.id);
    }
  };

  const renderSessionItem = ({ item }: { item: SessionListItem }) => {
    const isSelected = selectedSession === item.id;
    const hasTrackPoints = item.trackPoints.length > 0;

    return (
      <View style={styles.sessionItem}>
        <TouchableOpacity
          style={[
            styles.sessionHeader,
            isSelected && styles.sessionHeaderSelected,
          ]}
          onPress={() => handleSessionPress(item)}
        >
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionDate}>{item.formattedDate}</Text>
            <Text style={styles.sessionTime}>{item.formattedTime}</Text>
          </View>

          <View style={styles.sessionStats}>
            <Text style={styles.sessionDistance}>
              {formatDistance(item.totalDistance)}
            </Text>
            <Text style={styles.sessionDuration}>
              {formatDuration(item.totalTime)}
            </Text>
          </View>

          <View style={styles.sessionIndicator}>
            <Text style={styles.expandIcon}>{isSelected ? '▼' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        {isSelected && (
          <View style={styles.sessionDetails}>
            {/* Detailed Statistics */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>
                  {formatDistance(item.totalDistance)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {formatDuration(item.totalTime)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Avg Speed</Text>
                <Text style={styles.detailValue}>
                  {formatSpeed(item.averageSpeed)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Max Speed</Text>
                <Text style={styles.detailValue}>
                  {formatSpeed(item.maxSpeed)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Elevation Gain</Text>
                <Text style={styles.detailValue}>
                  {formatElevation(item.elevationGain)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Elevation Loss</Text>
                <Text style={styles.detailValue}>
                  {formatElevation(item.elevationLoss)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Track Points</Text>
                <Text style={styles.detailValue}>
                  {item.trackPoints.length.toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Started</Text>
                <Text style={styles.detailValue}>
                  {item.startTime.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {onViewSession && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => onViewSession(item)}
                >
                  <Text style={styles.actionButtonText}>View on Map</Text>
                </TouchableOpacity>
              )}

              {onExportSession && hasTrackPoints && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.exportButton]}
                  onPress={() => onExportSession(item)}
                >
                  <Text style={styles.actionButtonText}>Export</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteSession(item)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>

            {!hasTrackPoints && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>
                  ⚠️ This recording has no track points and cannot be exported.
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Recordings Yet</Text>
      <Text style={styles.emptyStateText}>
        Your completed GPS recordings will appear here. Start recording to
        create your first track!
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>
        {sessions.length} Recording{sessions.length !== 1 ? 's' : ''}
      </Text>
      {sessions.length > 0 && (
        <Text style={styles.listHeaderSubtext}>
          Tap a recording to view details and actions
        </Text>
      )}
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
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recording History</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.headerButton}
            disabled={isLoading}
          >
            <Text style={styles.headerButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Sessions List */}
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!isLoading ? renderEmptyState : null}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            sessions.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && sessions.length === 0 && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading recordings...</Text>
          </View>
        )}
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
    backgroundColor: theme.colors.backgroundSecondary,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  listHeader: {
    marginBottom: 16,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  listHeaderSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  sessionItem: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sessionHeaderSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  sessionStats: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  sessionDistance: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  sessionDuration: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  sessionIndicator: {
    width: 20,
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sessionDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: theme.colors.info,
  },
  exportButton: {
    backgroundColor: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningContainer: {
    backgroundColor: theme.colors.warning + '20',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.warning,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});

export default RecordingHistoryModal;
