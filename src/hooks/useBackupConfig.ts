import { useState } from 'react';
import { BackupConfig } from '../types';

export const useBackupConfig = () => {
  const [backupConfig, setBackupConfig] = useState<BackupConfig>({
    sourceDirectories: ['/DCIM/Camera'],
    targetDirectory: '/Photos/Backup'
  });

  const updateSourceDirectories = (paths: string[]) => {
    setBackupConfig(prev => ({
      ...prev,
      sourceDirectories: paths
    }));
  };

  const updateTargetDirectory = (path: string) => {
    setBackupConfig(prev => ({
      ...prev,
      targetDirectory: path
    }));
  };

  return {
    backupConfig,
    setBackupConfig,
    updateSourceDirectories,
    updateTargetDirectory
  };
};
