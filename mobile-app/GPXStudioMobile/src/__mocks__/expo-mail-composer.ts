/**
 * Mock for expo-mail-composer
 */

export const MailComposerStatus = {
  UNDETERMINED: 'undetermined',
  SENT: 'sent',
  SAVED: 'saved',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

export const isAvailableAsync = jest.fn().mockResolvedValue(true);

export const composeAsync = jest.fn().mockResolvedValue({
  status: MailComposerStatus.SENT,
});

export default {
  MailComposerStatus,
  isAvailableAsync,
  composeAsync,
};
