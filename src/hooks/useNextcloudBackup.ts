import { useState } from "react";
import { CapacitorHttp } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { NextcloudCredentials, BackupConfig } from "../types";

export const useNextcloudBackup = (
  credentials: NextcloudCredentials | null,
  backupConfig: BackupConfig,
) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [uploadDebugInfo, setUploadDebugInfo] = useState<string[]>([]);

  const addUploadDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setUploadDebugInfo((prev) => [
      ...prev.slice(-30),
      `${timestamp}: ${message}`,
    ]); // Keep last 30 messages
    console.log(`Upload: ${message}`);
  };

  const checkNextcloudConnection = async (): Promise<boolean> => {
    if (!credentials) return false;

    try {
      const response = await CapacitorHttp.get({
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}/`,
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
        },
      });

      return response.status === 207; // WebDAV returns 207 for successful PROPFIND
    } catch (error) {
      console.error("Nextcloud connection failed:", error);
      return false;
    }
  };

  const getNextcloudFiles = async (path: string): Promise<string[]> => {
    if (!credentials) return [];

    try {
      const response = await CapacitorHttp.request({
        method: "PROPFIND",
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}${path}`,
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          Depth: "1",
        },
      });

      // Parse WebDAV response to extract file names
      // This is a simplified parser - in production you'd want a proper XML parser
      const fileNames: string[] = [];
      const responseText = response.data;
      const regex =
        /<d:href[^>]*>\/remote\.php\/dav\/files\/[^\/]+\/[^<]*\/([^<\/]+)<\/d:href>/g;
      let match;

      while ((match = regex.exec(responseText)) !== null) {
        if (match[1] && match[1] !== path.split("/").pop()) {
          fileNames.push(decodeURIComponent(match[1]));
        }
      }

      return fileNames;
    } catch (error) {
      console.error("Error getting Nextcloud files:", error);
      return [];
    }
  };

  const uploadPhotoToNextcloud = async (
    photoPath: string,
    fileName: string,
  ): Promise<boolean> => {
    if (!credentials) return false;

    try {
      // Read the photo file
      const fileData = await Filesystem.readFile({
        path: photoPath,
        directory: Directory.ExternalStorage,
      });

      // Upload to Nextcloud
      const response = await CapacitorHttp.put({
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}${backupConfig.targetDirectory}/${fileName}`,
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          "Content-Type": "application/octet-stream",
        },
        data: fileData.data,
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return false;
    }
  };

  const performBackup = async (setBackupStatus: (status: string) => void) => {
    if (!credentials) {
      setBackupStatus("Please configure Nextcloud credentials first");
      addUploadDebugInfo("❌ No credentials configured");
      return;
    }

    setIsBackingUp(true);
    setUploadDebugInfo([]); // Clear previous debug info
    setBackupStatus("Starting backup...");
    addUploadDebugInfo("🚀 Starting backup process");

    try {
      // Check connection
      addUploadDebugInfo("🔗 Testing Nextcloud connection...");
      const isConnected = await checkNextcloudConnection();
      if (!isConnected) {
        setBackupStatus(
          "Failed to connect to Nextcloud. Please check credentials.",
        );
        addUploadDebugInfo(
          "❌ Connection failed - check credentials and server URL",
        );
        setIsBackingUp(false);
        return;
      }
      addUploadDebugInfo("✅ Connection successful");

      // Get existing files in target directory
      addUploadDebugInfo(
        `📂 Checking existing files in ${backupConfig.targetDirectory}`,
      );
      const existingFiles = await getNextcloudFiles(
        backupConfig.targetDirectory,
      );
      setBackupStatus(
        `Found ${existingFiles.length} existing files in Nextcloud`,
      );
      addUploadDebugInfo(
        `📋 Found ${existingFiles.length} existing files: ${existingFiles.slice(0, 5).join(", ")}${existingFiles.length > 5 ? "..." : ""}`,
      );

      // Get photos from device
      let uploadedCount = 0;
      let skippedCount = 0;
      let totalPhotos = 0;

      addUploadDebugInfo(
        `📱 Scanning ${backupConfig.sourceDirectories.length} source directories`,
      );

      for (const sourceDir of backupConfig.sourceDirectories) {
        try {
          addUploadDebugInfo(`📂 Processing directory: ${sourceDir}`);
          const result = await Filesystem.readdir({
            path: sourceDir,
            directory: Directory.ExternalStorage,
          });

          const photoFiles = result.files.filter((file) =>
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|heic|webp)$/),
          );

          totalPhotos += photoFiles.length;
          addUploadDebugInfo(
            `📸 Found ${photoFiles.length} photos in ${sourceDir}`,
          );

          for (const photo of photoFiles) {
            if (existingFiles.includes(photo.name)) {
              skippedCount++;
              setBackupStatus(`Skipping ${photo.name} (already exists)`);
              addUploadDebugInfo(`⏭️ Skipped ${photo.name} (already exists)`);
              continue;
            }

            setBackupStatus(
              `Uploading ${photo.name}... (${uploadedCount + skippedCount + 1}/${totalPhotos})`,
            );
            addUploadDebugInfo(
              `⬆️ Uploading ${photo.name} (${Math.round(((uploadedCount + skippedCount + 1) / totalPhotos) * 100)}%)`,
            );

            const startTime = Date.now();
            const success = await uploadPhotoToNextcloud(
              `${sourceDir}/${photo.name}`,
              photo.name,
            );
            const duration = Date.now() - startTime;

            if (success) {
              uploadedCount++;
              setBackupStatus(
                `Uploaded ${photo.name} (${uploadedCount} completed)`,
              );
              addUploadDebugInfo(
                `✅ ${photo.name} uploaded successfully (${duration}ms)`,
              );
            } else {
              setBackupStatus(`Failed to upload ${photo.name}`);
              addUploadDebugInfo(
                `❌ Failed to upload ${photo.name} after ${duration}ms`,
              );
            }
          }
        } catch (error) {
          addUploadDebugInfo(
            `❌ Error processing directory ${sourceDir}: ${error}`,
          );
          console.error(`Error processing directory ${sourceDir}:`, error);
        }
      }

      const finalMessage = `Backup completed! Uploaded: ${uploadedCount}, Skipped: ${skippedCount}, Total: ${totalPhotos}`;
      setBackupStatus(finalMessage);
      addUploadDebugInfo(`🎉 ${finalMessage}`);
    } catch (error) {
      console.error("Backup error:", error);
      const errorMessage = "Backup failed. Please try again.";
      setBackupStatus(errorMessage);
      addUploadDebugInfo(`❌ ${errorMessage} - ${error}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  return {
    isBackingUp,
    checkNextcloudConnection,
    getNextcloudFiles,
    uploadPhotoToNextcloud,
    performBackup,
    uploadDebugInfo,
  };
};
