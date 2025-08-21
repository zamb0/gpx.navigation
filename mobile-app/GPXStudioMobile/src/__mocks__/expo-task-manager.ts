export const defineTask = jest
  .fn()
  .mockImplementation((taskName, taskExecutor) => {
    // Store the task executor for testing
    (defineTask as any).taskExecutor = taskExecutor;
  });

export const startLocationUpdatesAsync = jest.fn();
export const stopLocationUpdatesAsync = jest.fn();

export default {
  defineTask,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
};
