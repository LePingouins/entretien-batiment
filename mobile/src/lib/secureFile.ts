import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { BASE_URL } from './config';
import { getToken } from './storage';

/**
 * Downloads an authenticated file (attachment/invoice) to the device cache and
 * opens the native share/preview sheet. Needed because these endpoints require
 * a Bearer token and cannot be opened directly via Linking.openURL.
 */
export async function openSecureFile(downloadUrl: string, filename: string): Promise<void> {
  try {
    const token = await getToken();
    const url = downloadUrl.startsWith('http') ? downloadUrl : `${BASE_URL}${downloadUrl}`;
    const dest = `${FileSystem.cacheDirectory}${filename}`;
    const result = await FileSystem.downloadAsync(url, dest, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (result.status !== 200) {
      throw new Error(`Download failed with status ${result.status}`);
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(result.uri);
    } else {
      Alert.alert('Fichier téléchargé', result.uri);
    }
  } catch {
    Alert.alert('Impossible d’ouvrir le fichier', 'Vérifiez votre connexion et réessayez.');
  }
}
