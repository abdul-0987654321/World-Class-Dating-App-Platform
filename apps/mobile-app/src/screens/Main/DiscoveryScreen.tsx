import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DiscoveryScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discovery</Text>
      <Text style={styles.subtitle}>Swipe interface coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default DiscoveryScreen;
