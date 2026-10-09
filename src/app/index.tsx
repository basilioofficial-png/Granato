import { StyleSheet, Text, View } from 'react-native';

import { APP_NAME, APP_TAGLINE } from '@/lib/appInfo';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.tagline}>{APP_TAGLINE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFF8F6',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#B3123A',
  },
  tagline: {
    marginTop: 12,
    fontSize: 16,
    color: '#5C4A4E',
    textAlign: 'center',
  },
});
