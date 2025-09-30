import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';

export default function PaymentForm({ onSubmit }) {
  const [amount, setAmount] = useState('');

  return (
    <View>
      <TextInput
        placeholder="Enter amount"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Button title="Create Order" onPress={() => onSubmit(Number(amount))} />
    </View>
  );
}