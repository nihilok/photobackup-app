import { useState, useEffect, useRef, useCallback } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { BackupConfig } from '../types';

interface ScanCache {
  directories: string[];
  photos: string[];
  lastScanTime: number;
}

export const usePhotoScanning = (backupConfig: BackupConfig) => {
  const [devicePhotos, setDevicePhotos] = useState<string[]>([]);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const scanningRef = useRef(false);
  const scanCacheRef = useRef<ScanCache | null>(null);

  const scanDirectoryRecursively = async (basePath: string, directory: any, maxDepth: number = 3, currentDepth: number = 0): Promise<string[]> => {
    if (currentDepth >= maxDepth) {
      console.log(`Max depth reached for ${basePath}`);
      return [];
    }

    let photoFiles: string[] = [];

    try {
      const result = await Filesystem.readdir({
        path: basePath,
        directory: directory
      });

      console.log(`📂 Scanning ${basePath} (depth ${currentDepth}): found ${result.files.length} items`);

      for (const file of result.files) {
        if (!scanningRef.current) {
          console.log('Scanning cancelled');
          return photoFiles;
        }

        const fullPath = basePath ? `${basePath}/${file.name}` : file.name;
        const fileName = file.name.toLowerCase();
        const isPhotoExtension = fileName.match(/\.(jpg|jpeg|png|gif|heic|webp|bmp|tiff?)$/i);

        console.log(`🔍 Examining: ${file.name} (type: ${file.type || 'unknown'})`);

        // Use file.type if available, otherwise fall back to directory test
        if (file.type === 'directory' || (!file.type && !isPhotoExtension)) {
          try {
            const subResult = await Filesystem.readdir({
              path: fullPath,
              directory: directory
            });

            console.log(`📁 Directory confirmed: ${fullPath} (${subResult.files.length} items) - scanning recursively`);
            const subPhotos = await scanDirectoryRecursively(fullPath, directory, maxDepth, currentDepth + 1);
            photoFiles.push(...subPhotos);

          } catch (err) {
            console.log(`❌ Cannot access as directory: ${fullPath}`, err);
          }
        } else if (isPhotoExtension) {
          try {
            const stat = await Filesystem.stat({
              path: fullPath,
              directory: directory
            });

            if (stat.type === 'file') {
              console.log(`📸 Photo file confirmed: ${fullPath} (size: ${stat.size} bytes)`);
              photoFiles.push(fullPath);
            } else {
              console.log(`⚠️ Has photo extension but is ${stat.type}: ${fullPath}`);
            }
          } catch (err) {
            console.log(`❌ Cannot stat potential photo file: ${fullPath}`, err);
          }
        } else {
          console.log(`📄 Non-photo file: ${file.name}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning ${basePath}:`, error);
    }

    console.log(`✅ Completed scanning ${basePath}: found ${photoFiles.length} photos`);
    return photoFiles;
  };

  const hasDirectoriesChanged = useCallback((newDirectories: string[]): boolean => {
    if (!scanCacheRef.current) return true;

    const oldDirs = scanCacheRef.current.directories;
    if (oldDirs.length !== newDirectories.length) return true;

    return !oldDirs.every((dir, index) => dir === newDirectories[index]);
  }, []);

  const loadDevicePhotos = useCallback(async (forceRescan: boolean = false) => {
    if (scanningRef.current) {
      console.log('Scan already in progress, skipping...');
      return;
    }

    const directoriesToScan = backupConfig.sourceDirectories.length > 0
      ? backupConfig.sourceDirectories
      : ['/DCIM/Camera'];

    // Check if we can use cached results
    if (!forceRescan && scanCacheRef.current && !hasDirectoriesChanged(directoriesToScan)) {
      const cacheAge = Date.now() - scanCacheRef.current.lastScanTime;
      if (cacheAge < 30000) { // Use cache for 30 seconds
        console.log('📋 Using cached scan results');
        setDevicePhotos(scanCacheRef.current.photos);
        setBackupStatus(`Found ${scanCacheRef.current.photos.length} photos (cached)`);
        return;
      }
    }

    scanningRef.current = true;
    setIsScanning(true);
    setBackupStatus('Scanning for photos...');

    try {
      setDevicePhotos([]);
      let totalPhotoFiles: string[] = [];

      console.log('🚀 Starting photo scan for directories:', directoriesToScan);

      for (const sourceDir of directoriesToScan) {
        if (!scanningRef.current) break;

        try {
          console.log(`\n=== 📂 Scanning directory: ${sourceDir} ===`);

          const cleanPath = sourceDir.replace(/^\/+/, '').replace(/\/+$/, '');
          console.log(`🧹 Cleaned path: "${cleanPath}" (original: "${sourceDir}")`);

          if (!cleanPath) {
            console.log('⚠️ Empty path after cleaning, skipping');
            continue;
          }

          // Test directory accessibility first
          try {
            const testResult = await Filesystem.readdir({
              path: cleanPath,
              directory: Directory.ExternalStorage
            });
            console.log(`✅ Directory accessible: ${cleanPath} (${testResult.files.length} items)`);
          } catch (accessError) {
            console.error(`❌ Cannot access directory ${cleanPath}:`, accessError);
            setBackupStatus(`Warning: Cannot access ${sourceDir}`);
            continue;
          }

          const foundPhotos = await scanDirectoryRecursively(cleanPath, Directory.ExternalStorage, 3);

          if (foundPhotos.length > 0) {
            console.log(`🎉 SUCCESS: Found ${foundPhotos.length} photos in ${sourceDir}`);
            console.log(`📋 Sample photos from ${sourceDir}:`, foundPhotos.slice(0, 3));
            totalPhotoFiles.push(...foundPhotos);
          } else {
            console.log(`😞 No photos found in ${sourceDir}`);
          }
        } catch (error) {
          console.error(`❌ Error processing directory ${sourceDir}:`, error);
          setBackupStatus(`Error scanning ${sourceDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const uniquePhotos = [...new Set(totalPhotoFiles)];

      // Update cache
      scanCacheRef.current = {
        directories: [...directoriesToScan],
        photos: uniquePhotos,
        lastScanTime: Date.now()
      };

      setDevicePhotos(uniquePhotos);

      console.log(`\n=== 🎯 FINAL RESULTS ===`);
      console.log(`Total unique photos found: ${uniquePhotos.length}`);
      console.log(`Directories scanned: ${directoriesToScan.length}`);

      if (uniquePhotos.length > 0) {
        console.log(`📸 Sample photos:`, uniquePhotos.slice(0, 5));
        setBackupStatus(`Found ${uniquePhotos.length} photos across ${directoriesToScan.length} directories`);
      } else {
        console.log(`❌ No photos found. Checked directories:`, directoriesToScan);
        setBackupStatus(`No photos found in ${directoriesToScan.length} directories. Try selecting different directories or check permissions.`);
      }
    } catch (error) {
      console.error('❌ Critical error during photo scanning:', error);
      setDevicePhotos([]);
      setBackupStatus(`Error scanning photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      scanningRef.current = false;
      setIsScanning(false);
    }
  }, [backupConfig.sourceDirectories, hasDirectoriesChanged]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (backupConfig.sourceDirectories.length > 0) {
        loadDevicePhotos();
      } else {
        setBackupStatus('No directories selected. Use the directory picker to select photo directories.');
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      scanningRef.current = false;
    };
  }, [backupConfig.sourceDirectories, loadDevicePhotos]);

  const forceRescan = useCallback(() => {
    loadDevicePhotos(true);
  }, [loadDevicePhotos]);

  return {
    devicePhotos,
    backupStatus,
    setBackupStatus,
    loadDevicePhotos,
    forceRescan,
    isScanning
  };
};
