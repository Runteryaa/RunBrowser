import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

export async function shareFile(fileUri: string) {
  if (!(await Sharing.isAvailableAsync())) {
    alert('Sharing is not available on this device');
    return;
  }
  try {
    await Sharing.shareAsync(fileUri);
  } catch (e) {
  }
}

export async function shareUrl(url: string, title?: string) {
  try {
    await Share.share({
      message: url,
      title: title || 'Share Link',
      url,
    });
  } catch (e) {
  }
}