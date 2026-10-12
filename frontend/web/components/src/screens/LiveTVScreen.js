// 📄 src/screens/LiveTVScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ScrollView
} from 'react-native';
import IPTVPlayer from '../components/IPTVPlayer';
import { getLiveChannels, parseM3UPlaylist } from '../utils/iptv';
import { generateSubtitlesWithWhisper } from '../utils/whisper';
import { fetchMetadataFromTMDB } from '../utils/tmdb';
import { logWatchHistory, getWatchHistory } from '../utils/history';

const presetPlaylists = [
  { name: 'Free IPTV Global', url: 'https://iptv-org.github.io/iptv/index.m3u' },
  { name: 'News Channels', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
  { name: 'Documentaries', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' }
];

const LiveTVScreen = () => {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [subtitles, setSubtitles] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [history, setHistory] = useState([]);
  const [channels, setChannels] = useState(getLiveChannels());
  const [m3uUrl, setM3uUrl] = useState('');
  const [savedPlaylists, setSavedPlaylists] = useState([]);

  const toggleFavorite = (channel) => {
    if (favorites.some(fav => fav.name === channel.name)) {
      setFavorites(favorites.filter(fav => fav.name !== channel.name));
    } else {
      setFavorites([...favorites, channel]);
    }
  };

  const filteredChannels = [...favorites, ...channels.filter(c =>
    !favorites.some(f => f.name === c.name) &&
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )];

  const loadM3U = async (url = m3uUrl) => {
    if (!url.trim()) return;
    try {
      const parsed = await parseM3UPlaylist(url);
      if (parsed.length > 0) {
        setChannels(parsed);
        setSavedPlaylists(prev => [...new Set([...prev, url])]);
        Alert.alert('Success', `Loaded ${parsed.length} channels.`);
      } else {
        Alert.alert('No Channels Found', 'Make sure your link is correct.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to parse playlist.');
    }
  };

  useEffect(() => {
    const fetchSubtitlesAndMetadata = async () => {
      if (selectedChannel) {
        try {
          const subData = await generateSubtitlesWithWhisper(selectedChannel.url);
          setSubtitles(subData);

          const meta = await fetchMetadataFromTMDB(selectedChannel.name);
          setMetadata(meta);

          await logWatchHistory(selectedChannel);
          const updatedHistory = await getWatchHistory();
          setHistory(updatedHistory);
        } catch (error) {
          logger.warn('AI fetch failed:', error);
        }
      }
    };
    fetchSubtitlesAndMetadata();
  }, [selectedChannel]);

  return (
    <ScrollView style={styles.container}>
      {!selectedChannel ? (
        <>
          <TextInput
            placeholder="🔍 Search channels..."
            placeholderTextColor="#666"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.m3uRow}>
            <TextInput
              style={styles.m3uInput}
              placeholder="Paste M3U Playlist URL"
              placeholderTextColor="#666"
              value={m3uUrl}
              onChangeText={setM3uUrl}
            />
            <TouchableOpacity onPress={() => loadM3U()} style={styles.loadButton}>
              <Text style={styles.loadText}>Load</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.presetTitle}>🎞️ Preset Playlists</Text>
          {presetPlaylists.map((pl, idx) => (
            <TouchableOpacity key={idx} onPress={() => loadM3U(pl.url)}>
              <Text style={styles.presetLink}>{pl.name}</Text>
            </TouchableOpacity>
          ))}

          {savedPlaylists.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={styles.historyTitle}>💾 Saved Playlists</Text>
              {savedPlaylists.map((url, idx) => (
                <Text key={idx} style={styles.historyItem}>{url}</Text>
              ))}
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={styles.historyTitle}>📜 Recently Watched</Text>
              {history.map((item, idx) => (
                <Text key={idx} style={styles.historyItem}>{item.name} — {new Date(item.timestamp).toLocaleTimeString()}</Text>
              ))}
            </View>
          )}

          <FlatList
            data={filteredChannels}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <View style={styles.channelItem}>
                <TouchableOpacity
                  style={styles.channelButton}
                  onPress={() => setSelectedChannel(item)}>
                  <View style={styles.channelRow}>
                    <Image
                      source={{ uri: item.thumbnail || 'https://via.placeholder.com/50x30.png?text=TV' }}
                      style={styles.logo}
                      resizeMode="contain"
                    />
                    <Text style={styles.channelText}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFavorite(item)}>
                  <Text style={styles.star}>{favorites.some(f => f.name === item.name) ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      ) : (
        <>
          <IPTVPlayer streamUrl={selectedChannel.url} />
          {metadata && (
            <View style={styles.metaBox}>
              <Text style={styles.metaTitle}>{metadata.title}</Text>
              <Text style={styles.metaText}>📅 {metadata.release_date}</Text>
              <Text style={styles.metaText}>🎭 {metadata.genre}</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

export default LiveTVScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  searchInput: {
    margin: 10,
    padding: 10,
    backgroundColor: '#111',
    color: '#fff',
    borderRadius: 8,
    fontSize: 16
  },
  m3uRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10
  },
  m3uInput: {
    flex: 1,
    backgroundColor: '#111',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    marginRight: 8
  },
  loadButton: {
    backgroundColor: '#00ffcc',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  loadText: {
    color: '#000',
    fontWeight: 'bold'
  },
  presetTitle: {
    color: '#00ffcc',
    fontWeight: 'bold',
    marginLeft: 12,
    marginTop: 10
  },
  presetLink: {
    color: '#1db954',
    marginLeft: 14,
    marginVertical: 4,
    fontSize: 14
  },
  historyBox: {
    backgroundColor: '#111',
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 10,
    borderRadius: 8
  },
  historyTitle: { color: '#00ffcc', fontWeight: 'bold', marginBottom: 5 },
  historyItem: { color: '#aaa', fontSize: 13 },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111'
  },
  channelButton: { flex: 1 },
  channelRow: { flexDirection: 'row', alignItems: 'center' },
  channelText: { color: '#00ffcc', fontSize: 16, paddingLeft: 12, flexShrink: 1 },
  logo: { width: 50, height: 30, borderRadius: 4, backgroundColor: '#222' },
  star: { color: '#ffd700', fontSize: 20, paddingLeft: 10 },
  metaBox: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 10
  },
  metaTitle: { color: '#00ffcc', fontWeight: 'bold', fontSize: 18 },
  metaText: { color: '#fff', fontSize: 14 }
});
