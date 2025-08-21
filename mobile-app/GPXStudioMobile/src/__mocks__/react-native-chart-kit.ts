// Mock react-native-chart-kit for testing

export const LineChart = jest.fn(({ onDataPointClick }) => {
  const mockChart = {
    type: 'LineChart',
    props: { onDataPointClick },
    // Simulate a chart click for testing
    click: () => onDataPointClick && onDataPointClick({ index: 5 }),
  };
  return mockChart;
});

export default {
  LineChart,
};
