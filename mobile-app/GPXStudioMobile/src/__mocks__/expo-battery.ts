export const getBatteryLevelAsync = jest.fn().mockResolvedValue(0.8);
export const getBatteryStateAsync = jest.fn().mockResolvedValue('UNPLUGGED');

export const BatteryState = {
  UNKNOWN: 'UNKNOWN',
  UNPLUGGED: 'UNPLUGGED',
  CHARGING: 'CHARGING',
  FULL: 'FULL',
  LOW_POWER_MODE: 'LOW_POWER_MODE',
};

export default {
  getBatteryLevelAsync,
  getBatteryStateAsync,
  BatteryState,
};
