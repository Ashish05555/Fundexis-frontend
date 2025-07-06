import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function TestBackendScreen() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://192.168.1.100:5000/search-instruments?query=nifty')
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message));
  }, []);

  if (error) return <Text>Error: {error}</Text>;
  if (!data) return <Text>Loading...</Text>;

  return (
    <ScrollView>
      {Array.isArray(data)
        ? data.map((item) => <Text key={item.instrument_token}>{item.name}</Text>)
        : <Text>{JSON.stringify(data)}</Text>}
    </ScrollView>
  );
}