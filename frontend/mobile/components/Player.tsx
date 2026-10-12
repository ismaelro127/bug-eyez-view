import React, { useState } from "react";
import Video, {
  TextTrackType,
  SelectedTrackType,
} from "react-native-video";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from "react-native";

interface PlayerProps {
  uri: string;
  subtitleUri?: string;
}

const Player: React.FC<PlayerProps> = ({ uri, subtitleUri }) => {
  const [subtitlesOn, setSubtitlesOn] = useState(true);

  const toggleSubtitles = () => {
    setSubtitlesOn((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <Video
        source={{ uri }}
        style={styles.video}
        controls
        resizeMode="contain"
        fullscreen
        paused={false}
        textTracks={
          subtitlesOn && subtitleUri
            ? [
                {
                  title: "English",
                  language: "en", // ISO639-1 ✅
                  type: "subtitles" as TextTrackType, // ✅ FIX
                  uri: subtitleUri,
                },
              ]
            : []
        }
        selectedTextTrack={
          subtitlesOn && subtitleUri
            ? {
                type: "title" as SelectedTrackType, // ✅ FIX
                value: "English",
              }
            : { type: "disabled" as SelectedTrackType } // ✅ FIX
        }
      />

      {subtitleUri && (
        <TouchableOpacity style={styles.button} onPress={toggleSubtitles}>
          <Text style={styles.buttonText}>
            {subtitlesOn ? "Disable" : "Enable"} Subtitles
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Player;

const styles = StyleSheet.create({
  container: { flex: 1 },
  video: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 100,
  },
  button: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    backgroundColor: "#00ffcc",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
});
