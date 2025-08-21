import { useState } from 'react';
import { Device } from '@capacitor/device';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const usePermissions = () => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const checkStoragePermissions = async (): Promise<boolean> => {
    try {
      console.log('Checking existing storage permissions...');

      // Try to access a basic directory to test permissions
      try {
        await Filesystem.readdir({
          path: '',
          directory: Directory.ExternalStorage
        });
        console.log('External storage access successful');
        setPermissionsGranted(true);
        return true;
      } catch (error) {
        console.log('External storage access failed:', error);
        setPermissionsGranted(false);
        return false;
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissionsGranted(false);
      return false;
    }
  };

  const requestStoragePermissions = async (): Promise<boolean> => {
    try {
      console.log('Requesting storage permissions...');

      // Get device info to determine Android version
      const deviceInfo = await Device.getInfo();
      console.log('Device info:', deviceInfo);

      // For Android 13+ (API 33+), we need different permissions
      const isAndroid13Plus = deviceInfo.platform === 'android' &&
        parseInt(deviceInfo.osVersion.split('.')[0]) >= 13;

      let allPermissionsGranted = true;

      if (isAndroid13Plus) {
        console.log('Android 13+ detected, requesting media permissions');

        // Request READ_MEDIA_IMAGES permission
        try {
          const mediaResult = await (window as any).Capacitor.Plugins.Device.requestPermissions({
            permissions: ['photos']
          });
          console.log('Media permissions result:', mediaResult);

          if (mediaResult.photos !== 'granted') {
            allPermissionsGranted = false;
          }
        } catch (error) {
          console.error('Error requesting media permissions:', error);
          allPermissionsGranted = false;
        }
      } else {
        console.log('Android 12 or lower, requesting external storage permissions');

        // For older Android versions, request external storage permissions
        try {
          const storageResult = await (window as any).Capacitor.Plugins.Device.requestPermissions({
            permissions: ['storage']
          });
          console.log('Storage permissions result:', storageResult);

          if (storageResult.storage !== 'granted') {
            allPermissionsGranted = false;
          }
        } catch (error) {
          console.error('Error requesting storage permissions:', error);
          allPermissionsGranted = false;
        }
      }

      // Also try to request permissions using the native Android way
      try {
        await (window as any).Capacitor.Plugins.Filesystem.requestPermissions();
      } catch (error) {
        console.log('Filesystem permission request not available or failed:', error);
      }

      setPermissionsGranted(allPermissionsGranted);
      return allPermissionsGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setPermissionsGranted(false);
      return false;
    }
  };

  return {
    permissionsGranted,
    checkStoragePermissions,
    requestStoragePermissions
  };
};
