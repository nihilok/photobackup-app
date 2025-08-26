import { useState } from "react";
import { CapacitorHttp } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { NextcloudCredentials, BackupConfig } from "../types";

export const useNextcloudBackup = (
  credentials: NextcloudCredentials | null,
  backupConfig: BackupConfig,
  devicePhotos: string[] = [], // Add devicePhotos parameter
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

  const getMimeType = (fileName: string): string => {
    const ext = fileName.toLowerCase().split(".").pop() || "";
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "heic":
      case "heif":
        return "image/heic";
      case "bmp":
        return "image/bmp";
      case "tif":
      case "tiff":
        return "image/tiff";
      case "dng":
        return "image/x-adobe-dng";
      default:
        return "application/octet-stream";
    }
  };

  const readFileFlexible = async (photoPath: string): Promise<string> => {
    // Returns base64 data string
    // Try absolute path without directory first
    try {
      addUploadDebugInfo(`📄 Reading file (absolute): ${photoPath}`);
      const fileData = await Filesystem.readFile({ path: photoPath });
      return typeof fileData.data === "string"
        ? fileData.data
        : await blobToBase64(fileData.data);
    } catch (e1) {
      addUploadDebugInfo(
        `⚠️ Absolute read failed, trying ExternalStorage fallback: ${photoPath}`,
      );
      // If under /storage/emulated/0 or /sdcard, strip the root and use ExternalStorage
      const candidates = ["/storage/emulated/0/", "/sdcard/"];
      for (const root of candidates) {
        if (photoPath.startsWith(root)) {
          const rel = photoPath.substring(root.length);
          try {
            addUploadDebugInfo(`📄 Reading file (ExternalStorage): ${rel}`);
            const fileData = await Filesystem.readFile({
              path: rel,
              directory: Directory.ExternalStorage,
            });
            return typeof fileData.data === "string"
              ? fileData.data
              : await blobToBase64(fileData.data);
          } catch (e2) {
            addUploadDebugInfo(`❌ ExternalStorage read failed for ${rel}`);
          }
        }
      }
      // Final attempt: if path begins with a single leading slash relative to external, try trimming leading slash
      try {
        const trimmed = photoPath.replace(/^\/+/, "");
        addUploadDebugInfo(`📄 Reading file (trimmed path): ${trimmed}`);
        const fileData = await Filesystem.readFile({
          path: trimmed,
          directory: Directory.ExternalStorage,
        });
        return typeof fileData.data === "string"
          ? fileData.data
          : await blobToBase64(fileData.data);
      } catch (e3) {
        addUploadDebugInfo(`❌ All read attempts failed for ${photoPath}`);
        throw e3;
      }
    }
  };

  // Helper function to convert Blob to base64 string
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 data
        const base64Data = result.split(",")[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const uploadPhotoToNextcloud = async (
    photoPath: string,
    fileName: string,
    targetDir: string, // Add targetDir parameter
  ): Promise<boolean> => {
    if (!credentials) return false;

    try {
      const contentType = getMimeType(fileName);
      const data = await readFileFlexible(photoPath);

      addUploadDebugInfo(
        `🌐 Uploading to Nextcloud: ${fileName} (${contentType})`,
      );
      const response = await CapacitorHttp.put({
        url: `${credentials.serverUrl}/remote.php/dav/files/${credentials.username}${targetDir}/${fileName}`,
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          "Content-Type": contentType,
        },
        data,
      });

      const ok = response.status >= 200 && response.status < 300;
      addUploadDebugInfo(
        ok
          ? `✅ Server accepted ${fileName} (status ${response.status})`
          : `❌ Server rejected ${fileName} (status ${response.status})`,
      );
      return ok;
    } catch (error) {
      addUploadDebugInfo(`❌ Exception uploading ${fileName}: ${error}`);
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

      // Use photos already found by MediaStore instead of re-scanning directories
      if (devicePhotos.length === 0) {
        addUploadDebugInfo(
          "❌ No photos found to backup. Please scan for photos first.",
        );
        setBackupStatus(
          "No photos found to backup. Please scan for photos first.",
        );
        setIsBackingUp(false);
        return;
      }

      let uploadedCount = 0;
      let skippedCount = 0;
      const totalPhotos = devicePhotos.length;

      addUploadDebugInfo(
        `📱 Using ${totalPhotos} photos found by MediaStore API`,
      );

      // Ensure target directory begins with a leading slash and no trailing slash
      const normalizedTargetDir = (() => {
        const raw = backupConfig.targetDirectory || "/";
        const withLeading = raw.startsWith("/") ? raw : `/${raw}`;
        return withLeading.replace(/\/$/, "") || "/";
      })();

      for (const photoPath of devicePhotos) {
        if (!isBackingUp) break; // Allow cancellation

        // Extract filename from full path
        const fileName = photoPath.split("/").pop() || "unknown.jpg";

        addUploadDebugInfo(`📸 Processing photo: ${fileName}`);

        if (existingFiles.includes(fileName)) {
          skippedCount++;
          setBackupStatus(`Skipping ${fileName} (already exists)`);
          addUploadDebugInfo(`⏭️ Skipped ${fileName} (already exists)`);
          continue;
        }

        setBackupStatus(
          `Uploading ${fileName}... (${uploadedCount + skippedCount + 1}/${totalPhotos})`,
        );
        addUploadDebugInfo(
          `⬆️ Uploading ${fileName} (${Math.round(((uploadedCount + skippedCount + 1) / totalPhotos) * 100)}%)`,
        );

        const startTime = Date.now();
        const success = await uploadPhotoToNextcloud(
          photoPath,
          fileName,
          normalizedTargetDir,
        );
        const duration = Date.now() - startTime;

        if (success) {
          uploadedCount++;
          setBackupStatus(`Uploaded ${fileName} (${uploadedCount} completed)`);
          addUploadDebugInfo(
            `✅ ${fileName} uploaded successfully (${duration}ms)`,
          );
        } else {
          setBackupStatus(`Failed to upload ${fileName}`);
          addUploadDebugInfo(
            `❌ Failed to upload ${fileName} after ${duration}ms`,
          );
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
