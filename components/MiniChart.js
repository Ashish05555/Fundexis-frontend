import React from "react";
import { View } from "react-native";
import { LineChart } from "react-native-chart-kit";

export default function MiniChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <View>
      <LineChart
        data={{
          datasets: [{ data: data.map(d => d.close) }]
        }}
        width={220}
        height={80}
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 2,
          color: () => "#2196F3",
          labelColor: () => "#333",
        }}
        withDots={false}
        withInnerLines={false}
        withOuterLines={false}
        withHorizontalLabels={false}
      />
    </View>
  );
}