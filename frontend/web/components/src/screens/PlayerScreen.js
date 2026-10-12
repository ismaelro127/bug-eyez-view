import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Player from '../components/Player';
import { extractMetadataFromUri } from '../utils/aiMetadata';

const PlayerScreen = ({ route }) => {
  const { videoUri } = route.params;
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      const data = await extractMetadataFromUri(videoUri);
      setMetadata(data);
    };
    fetchMetadata();
  }, [videoUri]);

  return (
    <View style={styles.container}>
      <Player uri={videoUri} />
      {metadata && (
        <View style={styles.metadataBox}>
          <Text style={styles.metaTitle}>🎞️ {metadata.title}</Text>
          <Text style={styles.metaText}>🎭 Genre: {metadata.genre}</Text>
          <Text style={styles.metaText}>🕒 Duration: {metadata.duration}</Text>
        </View>
      )}
    </View>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  metadataBox: {
    position: 'absolute',
    top: 40,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8
  },
  metaTitle: { color: '#00ffcc', fontWeight: 'bold', fontSize: 16 },
  metaText: { color: '#fff', fontSize: 14 }
});
