import { useState } from 'react';
import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { NextcloudCredentials, BackupConfig } from '../types';

export const useNextcloudBackup = (credentials: NextcloudCredentials | null, backupConfig: BackupConfig) => {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const checkNextcloudConnection = async (): Promise<boolean> => {
    if (!credentials) return false;

    try {
      const response = await CapacitorHttp.get({
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}/`,
        headers: {
          'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
        }
      });

      return response.status === 207; // WebDAV returns 207 for successful PROPFIND
    } catch (error) {
      console.error('Nextcloud connection failed:', error);
      return false;
    }
  };

  const getNextcloudFiles = async (path: string): Promise<string[]> => {
    if (!credentials) return [];

    try {
      const response = await CapacitorHttp.request({
        method: 'PROPFIND',
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}${path}`,
        headers: {
          'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          'Depth': '1'
        }
      });

      // Parse WebDAV response to extract file names
      // This is a simplified parser - in production you'd want a proper XML parser
      const fileNames: string[] = [];
      const responseText = response.data;
      const regex = /<d:href[^>]*>\/remote\.php\/dav\/files\/[^\/]+\/[^<]*\/([^<\/]+)<\/d:href>/g;
      let match;

      while ((match = regex.exec(responseText)) !== null) {
        if (match[1] && match[1] !== path.split('/').pop()) {
          fileNames.push(decodeURIComponent(match[1]));
        }
      }

      return fileNames;
    } catch (error) {
      console.error('Error getting Nextcloud files:', error);
      return [];
    }
  };

  const uploadPhotoToNextcloud = async (photoPath: string, fileName: string): Promise<boolean> => {
    if (!credentials) return false;

    try {
      // Read the photo file
      const fileData = await Filesystem.readFile({
        path: photoPath,
        directory: Directory.ExternalStorage
      });

      // Upload to Nextcloud
      const response = await CapacitorHttp.put({
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}${backupConfig.targetDirectory}/${fileName}`,
        headers: {
          'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          'Content-Type': 'application/octet-stream'
        },
        data: fileData.data
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return false;
    }
  };

  const performBackup = async (setBackupStatus: (status: string) => void) => {
    if (!credentials) {
      setBackupStatus('Please configure Nextcloud credentials first');
      return;
    }

    setIsBackingUp(true);
    setBackupStatus('Starting backup...');

    try {
      // Check connection
      const isConnected = await checkNextcloudConnection();
      if (!isConnected) {
        setBackupStatus('Failed to connect to Nextcloud. Please check credentials.');
        setIsBackingUp(false);
        return;
      }

      // Get existing files in target directory
      const existingFiles = await getNextcloudFiles(backupConfig.targetDirectory);
      setBackupStatus(`Found ${existingFiles.length} existing files in Nextcloud`);

      // Get photos from device
      let uploadedCount = 0;
      let skippedCount = 0;

      for (const sourceDir of backupConfig.sourceDirectories) {
        try {
          const result = await Filesystem.readdir({
            path: sourceDir,
            directory: Directory.ExternalStorage
          });

          const photoFiles = result.files.filter(file =>
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)
          );

          for (const photo of photoFiles) {
            if (existingFiles.includes(photo.name)) {
              skippedCount++;
              setBackupStatus(`Skipping ${photo.name} (already exists)`);
              continue;
            }

            setBackupStatus(`Uploading ${photo.name}...`);
            const success = await uploadPhotoToNextcloud(`${sourceDir}/${photo.name}`, photo.name);

            if (success) {
              uploadedCount++;
              setBackupStatus(`Uploaded ${photo.name} (${uploadedCount} completed)`);
            } else {
              setBackupStatus(`Failed to upload ${photo.name}`);
            }
          }
        } catch (error) {
          console.error(`Error processing directory ${sourceDir}:`, error);
        }
      }

      setBackupStatus(`Backup completed! Uploaded: ${uploadedCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      console.error('Backup error:', error);
      setBackupStatus('Backup failed. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  return {
    isBackingUp,
    checkNextcloudConnection,
    getNextcloudFiles,
    uploadPhotoToNextcloud,
    performBackup
  };
};
