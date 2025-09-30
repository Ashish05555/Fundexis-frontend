import React from 'react';
import { View, Text } from 'react-native';

export default function PaymentResult({ data }) {
  return (
    <View>
      <Text>Result:</Text>
      <Text>{JSON.stringify(data, null, 2)}</Text>
    </View>
  );
}