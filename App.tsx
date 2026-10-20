import React, {useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView, {type WebViewNavigation} from 'react-native-webview';

const APP_URL = 'https://www.bugeyezview.com';

export default function App(): React.JSX.Element {
  const webViewRef = useRef<WebView>(null);

  const [canGoBack, setCanGoBack] = useState(false);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }

        return false;
      },
    );

    return () => subscription.remove();
  }, [canGoBack]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Bug Eyez View</Text>

          <Text style={styles.errorText}>
            Unable to connect. Check your internet connection and try again.
          </Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          source={{uri: APP_URL}}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          onNavigationStateChange={(navState: WebViewNavigation) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadStart={() => {
            setHasError(false);
          }}
          onError={() => {
            setHasError(true);
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>
                Loading Bug Eyez View...
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070b',
  },

  webView: {
    flex: 1,
    backgroundColor: '#05070b',
  },

  loadingContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070b',
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#05070b',
  },

  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },

  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#c5cbd6',
  },
});