import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

export default function LivePrice() {
  const [status, setStatus] = useState('Connecting...');
  const [price, setPrice] = useState(null);
  const wsUrl = 'ws://192.168.29.246:5000';

  useEffect(() => {
    console.log('ATTEMPTING WS:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setStatus('Connected');
      console.log('WebSocket OPEN');
      // Test message: comment out if your server expects a specific payload
      // ws.send(JSON.stringify({ action: 'subscribe', token: 738561 }));
    };
    ws.onmessage = (event) => {
      console.log('MESSAGE:', event.data);
      setPrice(event.data);
    };
    ws.onerror = (e) => {
      setStatus('Error: ' + e.message);
      console.log('WebSocket ERROR:', e.message);
    };
    ws.onclose = () => {
      setStatus('Closed');
      console.log('WebSocket CLOSED');
    };
    return () => ws.close();
  }, []);

  return (
    <View style={{alignItems: 'center', marginTop: 50}}>
      <Text style={{fontSize: 18, color: 'blue'}}>Status: {status}</Text>
      <Text style={{fontSize: 24, marginTop: 20}}>Live Price: {price !== null ? price : '...'}</Text>
    </View>
  );
}