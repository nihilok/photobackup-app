import { useEffect, useRef } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';

export const useAppInitialization = (
  checkStoragePermissions: () => Promise<boolean>,
  loadCredentials: () => Promise<void>,
  loadDevicePhotos: () => Promise<void>
) => {
  const initializedRef = useRef(false);

  useEffect(() => {
    const initializeApp = async () => {
      // Prevent multiple initializations
      if (initializedRef.current) {
        console.log('App already initialized, skipping...');
        return;
      }

      initializedRef.current = true;
      let splashHidden = false;

      try {
        console.log('Initializing app...');

        // Check permissions first
        const hasPermissions = await checkStoragePermissions();
        console.log('Permissions check result:', hasPermissions);

        // Load initial data
        await loadCredentials();

        // Don't automatically scan for photos on initialization
        // Let the user trigger it manually or let the photo scanning hook handle it
        console.log('App initialization complete');

        // Hide splash screen after app is ready
        console.log('Hiding splash screen...');
        await SplashScreen.hide();
        splashHidden = true;
        console.log('Splash screen should be hidden.');
      } catch (error) {
        console.error('Error initializing app:', error);
        // Hide splash screen even if there's an error to prevent it from staying visible
        if (!splashHidden) {
          console.log('Error occurred, hiding splash screen...');
          try {
            await SplashScreen.hide();
            splashHidden = true;
          } catch (splashError) {
            console.error('Failed to hide splash screen:', splashError);
          }
          console.log('Splash screen should be hidden after error.');
        }
      }

      // Fallback: hide splash screen after 5 seconds if not already hidden
      setTimeout(async () => {
        if (!splashHidden) {
          console.log('Fallback: hiding splash screen after timeout.');
          try {
            await SplashScreen.hide();
          } catch (splashError) {
            console.error('Failed to hide splash screen in fallback:', splashError);
          }
        }
      }, 5000);
    };

    initializeApp();
  }, []); // Empty dependency array to run only once
};
