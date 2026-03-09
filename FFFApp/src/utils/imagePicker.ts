import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

export const pickImage = async (fromCamera: boolean = false): Promise<string | null> => {
  try {
    // Request permissions
    if (fromCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return null;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Gallery permission is needed to choose photos');
        return null;
      }
    }

    // Launch picker
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5
        });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Resize image to max 400x400 to reduce file size
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400, height: 400 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      return manipulatedImage.uri;
    }

    return null;
  } catch (error) {
    console.error('Image picker error:', error);
    Alert.alert('Error', 'Failed to pick image');
    return null;
  }
};

export const convertImageToBase64 = async (uri: string): Promise<string | null> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        
        // Log size for debugging
        const sizeInMB = (base64.length * 3) / 4 / 1024 / 1024;
        console.log(`📸 Image size: ${sizeInMB.toFixed(2)} MB`);
        
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Convert to base64 error:', error);
    return null;
  }
};