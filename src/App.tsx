import React from 'react';
import DirectoryPicker from './components/DirectoryPicker';
import NextcloudConfig from './components/NextcloudConfig';
import PermissionsConfig from './components/PermissionsConfig';
import { useCredentials } from './hooks/useCredentials';
import { usePermissions } from './hooks/usePermissions';
import { useBackupConfig } from './hooks/useBackupConfig';
import { usePhotoScanning } from './hooks/usePhotoScanning';
import { useNextcloudBackup } from './hooks/useNextcloudBackup';
import { useAppInitialization } from './hooks/useAppInitialization';

const App: React.FC = () => {
  // Custom hooks for state management
  const { credentials, setCredentials, saveCredentials, loadCredentials } = useCredentials();
  const { permissionsGranted, checkStoragePermissions, requestStoragePermissions } = usePermissions();
  const { backupConfig, updateSourceDirectories, updateTargetDirectory } = useBackupConfig();
  const { devicePhotos, backupStatus, setBackupStatus, loadDevicePhotos, isScanning } = usePhotoScanning(backupConfig);
  const { isBackingUp, performBackup } = useNextcloudBackup(credentials, backupConfig);

  // Initialize app on startup (removed loadDevicePhotos to prevent duplicate scanning)
  useAppInitialization(checkStoragePermissions, loadCredentials, async () => {});

  const handleBackup = async () => {
    await performBackup(setBackupStatus);
  };

  return (
    <>
      {/* Status Bar for mobile devices */}
      <div className="status-bar"></div>

      <div className="app">
        <header>
          <h1>📸 Photo Backup</h1>
          <p>Backup your photos to Nextcloud</p>
        </header>

        <main>
          {/* Permissions Section */}
          <PermissionsConfig
            permissionsGranted={permissionsGranted}
            requestStoragePermissions={requestStoragePermissions}
            checkStoragePermissions={checkStoragePermissions}
          />

          {/* Nextcloud Configuration */}
          <NextcloudConfig
            credentials={credentials}
            setCredentials={setCredentials}
            saveCredentials={saveCredentials}
          />

          {/* Backup Configuration */}
          <section className="config-section">
            <h2>📁 Backup Configuration</h2>
            <DirectoryPicker
              selectedPaths={backupConfig.sourceDirectories}
              onPathsChange={updateSourceDirectories}
              title="Source Directories"
            />
            <div className="form-group">
              <label>Target Directory on Nextcloud:</label>
              <input
                type="text"
                value={backupConfig.targetDirectory}
                onChange={(e) => updateTargetDirectory(e.target.value)}
                placeholder="/Photos/Backup"
              />
            </div>
          </section>

          {/* Device Photos Info */}
          <section className="info-section">
            <h2>📱 Device Photos</h2>
            <p>
              {isScanning
                ? 'Scanning for photos...'
                : `Found ${devicePhotos.length} photos in ${backupConfig.sourceDirectories.length} selected ${backupConfig.sourceDirectories.length === 1 ? 'directory' : 'directories'}`
              }
            </p>
            <button
              onClick={() => loadDevicePhotos(true)}
              className="refresh-btn"
              disabled={isScanning}
            >
              {isScanning ? '⏳ Scanning...' : '🔄 Refresh'}
            </button>
          </section>

          {/* Backup Actions */}
          <section className="backup-section">
            <h2>☁️ Backup Actions</h2>
            <button
              onClick={handleBackup}
              disabled={isBackingUp || !credentials || isScanning}
              className="backup-btn"
            >
              {isBackingUp ? '⏳ Backing up...' : '🚀 Start Backup'}
            </button>

            {backupStatus && (
              <div className="status-message">
                {backupStatus}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

export default App;
