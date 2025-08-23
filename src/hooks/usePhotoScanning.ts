import { useState, useEffect, useRef, useCallback } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Media } from "@capacitor-community/media";
import { BackupConfig } from "../types";

interface ScanCache {
  directories: string[];
  photos: string[];
  lastScanTime: number;
}

export const usePhotoScanning = (backupConfig: BackupConfig) => {
  const [devicePhotos, setDevicePhotos] = useState<string[]>([]);
  const [backupStatus, setBackupStatus] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const scanningRef = useRef(false);
  const scanCacheRef = useRef<ScanCache | null>(null);

  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo((prev) => [...prev.slice(-20), `${timestamp}: ${message}`]); // Keep last 20 messages
    console.log(message);
  };

  // New Android-specific photo scanning using @capacitor-community/media
  const scanPhotosWithMediaStore = async (
    directoriesToScan: string[],
  ): Promise<string[]> => {
    addDebugInfo(
      "🤖 Using @capacitor-community/media plugin for MediaStore access",
    );

    try {
      if (Capacitor.getPlatform() === "android") {
        addDebugInfo("📱 Android detected - trying Media plugin");

        // Request permissions first
        try {
          addDebugInfo("📸 Requesting media permissions");
          const permissions = await Media.requestPermissions();
          addDebugInfo(`📋 Media permissions: ${JSON.stringify(permissions)}`);

          if (permissions.photos !== "granted") {
            addDebugInfo("❌ Media permissions not granted");
            return [];
          }

          addDebugInfo("✅ Media permissions granted, scanning photos");

          // Get all photos from MediaStore
          const result = await Media.getPhotos({
            limit: 10000, // Large limit to get all photos
            offset: 0,
          });

          addDebugInfo(
            `📸 MediaStore found ${result.photos.length} total photos`,
          );

          if (result.photos.length === 0) {
            addDebugInfo("😞 No photos found in MediaStore");
            return [];
          }

          // Filter photos based on directory requirements
          let filteredPhotos: string[] = [];

          if (
            directoriesToScan.length === 1 &&
            directoriesToScan[0] === "/DCIM/Camera"
          ) {
            // Filter for DCIM/Camera specifically
            filteredPhotos = result.photos
              .filter((photo) => {
                const path = photo.path?.toLowerCase() || "";
                return (
                  path.includes("dcim/camera") || path.includes("dcim\\camera")
                );
              })
              .map((photo) => photo.path || "");

            addDebugInfo(
              `📋 Filtered to ${filteredPhotos.length} photos in DCIM/Camera`,
            );
          } else {
            // Filter for specified directories
            for (const directory of directoriesToScan) {
              const cleanDir = directory
                .replace(/^\/+/, "")
                .replace(/\/+$/, "")
                .toLowerCase();
              const dirPhotos = result.photos
                .filter((photo) => {
                  const path = photo.path?.toLowerCase() || "";
                  return path.includes(cleanDir);
                })
                .map((photo) => photo.path || "");

              addDebugInfo(
                `📂 Found ${dirPhotos.length} photos in ${directory}`,
              );
              filteredPhotos.push(...dirPhotos);
            }
          }

          // Remove duplicates and empty paths
          const uniquePhotos = [...new Set(filteredPhotos)].filter(
            (path) => path.length > 0,
          );

          if (uniquePhotos.length > 0) {
            addDebugInfo(
              `🎉 MediaStore SUCCESS: Found ${uniquePhotos.length} photos!`,
            );
            addDebugInfo(
              `📋 Sample photos: ${uniquePhotos.slice(0, 3).join(", ")}`,
            );
          }

          return uniquePhotos;
        } catch (error) {
          addDebugInfo(`❌ Media plugin error: ${error}`);
          return [];
        }
      }

      return [];
    } catch (error) {
      addDebugInfo(`❌ MediaStore scan failed: ${error}`);
      return [];
    }
  };

  const scanDirectoryRecursively = async (
    basePath: string,
    directory: any,
    maxDepth: number = 3,
    currentDepth: number = 0,
  ): Promise<string[]> => {
    if (currentDepth >= maxDepth) {
      addDebugInfo(`Max depth reached for ${basePath}`);
      return [];
    }

    let photoFiles: string[] = [];

    try {
      const result = await Filesystem.readdir({
        path: basePath,
        directory: directory,
      });

      addDebugInfo(
        `📂 Scanning ${basePath} (depth ${currentDepth}): found ${result.files.length} items`,
      );

      // Add detailed logging of ALL files found
      addDebugInfo(`📋 All items in ${basePath}:`);
      result.files.forEach((file, index) => {
        addDebugInfo(
          `  ${index + 1}. "${file.name}" (type: ${file.type || "unknown"})`,
        );
      });

      // Also try to list any hidden files or files that might not be showing up
      addDebugInfo(`🔍 Attempting to find any missed files in ${basePath}:`);

      for (const file of result.files) {
        if (!scanningRef.current) {
          addDebugInfo("Scanning cancelled");
          return photoFiles;
        }

        const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
        const fileName = file.name.toLowerCase();

        // Enhanced photo extension matching - be more aggressive
        const photoExtensions =
          /\.(jpe?g|png|gif|heic|heif|webp|bmp|tiff?|raw|cr2|nef|arw|dng)$/i;
        const isPhotoExtension = photoExtensions.test(fileName);

        addDebugInfo(
          `🔍 Examining: ${file.name} (type: ${file.type || "unknown"}, hasPhotoExt: ${isPhotoExtension})`,
        );

        // First, check if this has a photo extension - prioritize photo detection
        if (isPhotoExtension) {
          const extensionMatch = fileName.match(photoExtensions);
          addDebugInfo(
            `📸 Found potential photo: ${file.name} (extension: ${extensionMatch?.[0] || "unknown"})`,
          );

          try {
            // Try to stat the file to confirm it's actually a file
            const stat = await Filesystem.stat({
              path: fullPath,
              directory: directory,
            });

            if (stat.type === "file") {
              addDebugInfo(
                `✅ Photo file confirmed via stat: ${fullPath} (size: ${stat.size} bytes)`,
              );
              photoFiles.push(fullPath);
            } else {
              addDebugInfo(
                `⚠️ Has photo extension but stat says ${stat.type}: ${fullPath}`,
              );
            }
          } catch (err) {
            addDebugInfo(
              `⚠️ Stat failed for photo file: ${fullPath} - Error: ${err}`,
            );

            // On Android, stat often fails for valid files due to permission issues
            // Let's be more aggressive and assume it's a photo file if it has the right extension
            // and we're not in a known system directory
            const isInSystemDir =
              fullPath.toLowerCase().includes("/android_secure/") ||
              fullPath.toLowerCase().includes("/system/") ||
              fullPath.toLowerCase().includes("/.android_secure/");

            if (!isInSystemDir) {
              addDebugInfo(
                `🔄 Adding photo despite stat failure (not in system dir): ${fullPath}`,
              );
              photoFiles.push(fullPath);
            } else {
              addDebugInfo(
                `❌ Skipping photo in system directory: ${fullPath}`,
              );
            }
          }
        } else {
          // For non-photo files, check if it's a directory we should recurse into
          let isDirectory = false;

          // First check file.type if available
          if (file.type === "directory") {
            isDirectory = true;
          } else if (file.type === "file") {
            isDirectory = false;
          } else {
            // file.type is unreliable on Android, so try to determine by attempting directory operations
            try {
              // Try to read it as a directory
              const subResult = await Filesystem.readdir({
                path: fullPath,
                directory: directory,
              });
              // If readdir succeeds, it's a directory
              isDirectory = true;
              addDebugInfo(
                `📁 Directory confirmed via readdir: ${fullPath} (${subResult.files.length} items)`,
              );
            } catch (err) {
              // If readdir fails, it's likely a file (or inaccessible)
              isDirectory = false;
              addDebugInfo(`📄 Not a directory (readdir failed): ${fullPath}`);
            }
          }

          if (isDirectory) {
            addDebugInfo(`📁 Scanning subdirectory: ${fullPath}`);
            const subPhotos = await scanDirectoryRecursively(
              fullPath,
              directory,
              maxDepth,
              currentDepth + 1,
            );
            photoFiles.push(...subPhotos);
          } else {
            addDebugInfo(`📄 Non-photo file: ${file.name}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning ${basePath}:`, error);
    }

    addDebugInfo(
      `✅ Completed scanning ${basePath}: found ${photoFiles.length} photos`,
    );
    return photoFiles;
  };

  const hasDirectoriesChanged = useCallback(
    (newDirectories: string[]): boolean => {
      if (!scanCacheRef.current) return true;

      const oldDirs = scanCacheRef.current.directories;
      if (oldDirs.length !== newDirectories.length) return true;

      return !oldDirs.every((dir, index) => dir === newDirectories[index]);
    },
    [],
  );

  const loadDevicePhotos = useCallback(
    async (forceRescan: boolean = false) => {
      if (scanningRef.current) {
        addDebugInfo("Scan already in progress, skipping...");
        return;
      }

      const directoriesToScan =
        backupConfig.sourceDirectories.length > 0
          ? backupConfig.sourceDirectories
          : ["/DCIM/Camera"];

      // Check if we can use cached results
      if (
        !forceRescan &&
        scanCacheRef.current &&
        !hasDirectoriesChanged(directoriesToScan)
      ) {
        const cacheAge = Date.now() - scanCacheRef.current.lastScanTime;
        if (cacheAge < 30000) {
          // Use cache for 30 seconds
          addDebugInfo("📋 Using cached scan results");
          setDevicePhotos(scanCacheRef.current.photos);
          setBackupStatus(
            `Found ${scanCacheRef.current.photos.length} photos (cached)`,
          );
          return;
        }
      }

      scanningRef.current = true;
      setIsScanning(true);
      setBackupStatus("Scanning for photos...");

      try {
        setDevicePhotos([]);
        let totalPhotoFiles: string[] = [];

        addDebugInfo(
          `🚀 Starting photo scan for directories: ${directoriesToScan.join(", ")}`,
        );

        // Try Android MediaStore first if on Android
        if (Capacitor.getPlatform() === "android") {
          addDebugInfo("📱 Detected Android platform, trying MediaStore API");
          const mediaStorePhotos =
            await scanPhotosWithMediaStore(directoriesToScan);

          if (mediaStorePhotos.length > 0) {
            addDebugInfo(
              `🎉 MediaStore found ${mediaStorePhotos.length} photos!`,
            );
            totalPhotoFiles = mediaStorePhotos;
          } else {
            addDebugInfo(
              "😞 MediaStore found no photos, falling back to filesystem scan",
            );
            // Fall back to filesystem scanning if MediaStore fails
            for (const sourceDir of directoriesToScan) {
              if (!scanningRef.current) break;

              try {
                addDebugInfo(
                  `=== 📂 Fallback filesystem scan: ${sourceDir} ===`,
                );

                const cleanPath = sourceDir
                  .replace(/^\/+/, "")
                  .replace(/\/+$/, "");
                addDebugInfo(
                  `🧹 Cleaned path: "${cleanPath}" (original: "${sourceDir}")`,
                );

                if (!cleanPath) {
                  addDebugInfo("⚠️ Empty path after cleaning, skipping");
                  continue;
                }

                const foundPhotos = await scanDirectoryRecursively(
                  cleanPath,
                  Directory.ExternalStorage,
                  3,
                );

                if (foundPhotos.length > 0) {
                  addDebugInfo(
                    `🎉 SUCCESS: Found ${foundPhotos.length} photos in ${sourceDir}`,
                  );
                  totalPhotoFiles.push(...foundPhotos);
                } else {
                  addDebugInfo(`😞 No photos found in ${sourceDir}`);
                }
              } catch (error) {
                addDebugInfo(
                  `❌ Error processing directory ${sourceDir}: ${error}`,
                );
              }
            }
          }
        } else {
          // For non-Android platforms, use filesystem scanning
          addDebugInfo("💻 Non-Android platform, using filesystem scan");
          for (const sourceDir of directoriesToScan) {
            if (!scanningRef.current) break;

            try {
              addDebugInfo(`=== 📂 Scanning directory: ${sourceDir} ===`);

              const cleanPath = sourceDir
                .replace(/^\/+/, "")
                .replace(/\/+$/, "");

              const foundPhotos = await scanDirectoryRecursively(
                cleanPath,
                Directory.ExternalStorage,
                3,
              );

              if (foundPhotos.length > 0) {
                totalPhotoFiles.push(...foundPhotos);
              }
            } catch (error) {
              addDebugInfo(
                `❌ Error processing directory ${sourceDir}: ${error}`,
              );
            }
          }
        }

        const uniquePhotos = [...new Set(totalPhotoFiles)];

        // Update cache
        scanCacheRef.current = {
          directories: [...directoriesToScan],
          photos: uniquePhotos,
          lastScanTime: Date.now(),
        };

        setDevicePhotos(uniquePhotos);

        addDebugInfo(`=== 🎯 FINAL RESULTS ===`);
        addDebugInfo(`Total unique photos found: ${uniquePhotos.length}`);
        addDebugInfo(`Directories scanned: ${directoriesToScan.length}`);

        if (uniquePhotos.length > 0) {
          addDebugInfo(
            `📸 Sample photos: ${uniquePhotos.slice(0, 5).join(", ")}`,
          );
          setBackupStatus(
            `Found ${uniquePhotos.length} photos across ${directoriesToScan.length} directories`,
          );
        } else {
          addDebugInfo(
            `❌ No photos found. Checked directories: ${directoriesToScan.join(", ")}`,
          );
          setBackupStatus(
            `No photos found in ${directoriesToScan.length} directories. Try selecting different directories or check permissions.`,
          );
        }
      } catch (error) {
        console.error("❌ Critical error during photo scanning:", error);
        setDevicePhotos([]);
        setBackupStatus(
          `Error scanning photos: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        scanningRef.current = false;
        setIsScanning(false);
      }
    },
    [backupConfig.sourceDirectories, hasDirectoriesChanged],
  );

  return {
    devicePhotos,
    backupStatus,
    isScanning,
    debugInfo,
    loadDevicePhotos,
  };
};
