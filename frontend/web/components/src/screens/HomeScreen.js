import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎬 Bug Eyez View</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Player', { videoUri: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' })}
      >
        <Text style={styles.buttonText}>▶ Play Sample Stream</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { fontSize: 28, color: '#00ffcc', fontWeight: 'bold' },
  button: { marginTop: 20, backgroundColor: '#00ffcc', padding: 15, borderRadius: 10 },
  buttonText: { fontSize: 16, color: '#000' }
});
