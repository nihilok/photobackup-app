import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { NextcloudCredentials } from '../types';

export const useCredentials = () => {
  const [credentials, setCredentials] = useState<NextcloudCredentials | null>(null);

  const loadCredentials = async () => {
    try {
      const { value } = await Preferences.get({ key: 'nextcloud_credentials' });
      if (value) {
        setCredentials(JSON.parse(value));
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const saveCredentials = async (creds: NextcloudCredentials) => {
    try {
      await Preferences.set({
        key: 'nextcloud_credentials',
        value: JSON.stringify(creds)
      });
      setCredentials(creds);
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  return {
    credentials,
    setCredentials,
    saveCredentials,
    loadCredentials
  };
};
