import React from "react";
import { DirectoryPicker } from "./components/DirectoryPicker";
import { NextcloudConfig } from "./components/NextcloudConfig";
import { PermissionsConfig } from "./components/PermissionsConfig";
import { BackupActions } from "./components/BackupActions";
import { DebugInfo } from "./components/DebugInfo";
import { MaterialSymbol } from "./components/MaterialSymbol";
import { useCredentials } from "./hooks/useCredentials";
import { usePermissions } from "./hooks/usePermissions";
import { useBackupConfig } from "./hooks/useBackupConfig";
import { usePhotoScanning } from "./hooks/usePhotoScanning";
import { useNextcloudBackup } from "./hooks/useNextcloudBackup";
import { useAppInitialization } from "./hooks/useAppInitialization";

const App: React.FC = () => {
  // Custom hooks for state management
  const { credentials, setCredentials, saveCredentials, loadCredentials } =
    useCredentials();
  const {
    permissionsGranted,
    checkStoragePermissions,
    requestStoragePermissions,
  } = usePermissions();
  const { backupConfig, updateSourceDirectories, updateTargetDirectory } =
    useBackupConfig();
  const {
    devicePhotos,
    backupStatus,
    setBackupStatus,
    loadDevicePhotos,
    isScanning,
    debugInfo,
  } = usePhotoScanning(backupConfig);
  const { isBackingUp, performBackup, uploadDebugInfo } = useNextcloudBackup(
    credentials,
    backupConfig,
    devicePhotos, // Pass the photos found by MediaStore
  );

  // Initialize app on startup (removed loadDevicePhotos to prevent duplicate scanning)
  useAppInitialization(
    checkStoragePermissions,
    loadCredentials,
    async () => {},
  );

  const handleBackup = async () => {
    await performBackup(setBackupStatus);
  };

  return (
    <>
      {/* Status Bar for mobile devices */}
      <div className="status-bar"></div>

      <div className="app">
        <header>
          <h1>
            <MaterialSymbol icon="photo_camera" size={32} /> Photo Backup
          </h1>
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
            <h2>
              <MaterialSymbol icon="folder" size={24} /> Backup Configuration
            </h2>
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
            <h2>
              <MaterialSymbol icon="smartphone" size={24} /> Device Photos
            </h2>
            <p>
              {isScanning
                ? "Scanning for photos..."
                : `Found ${devicePhotos.length} photos in ${backupConfig.sourceDirectories.length} selected ${backupConfig.sourceDirectories.length === 1 ? "directory" : "directories"}`}
            </p>
            <button
              onClick={() => loadDevicePhotos(true)}
              className="refresh-btn"
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <MaterialSymbol icon="hourglass_empty" size={18} />{" "}
                  Scanning...
                </>
              ) : (
                <>
                  <MaterialSymbol icon="refresh" size={18} /> Refresh
                </>
              )}
            </button>

            {/* Debug Info Component */}
            <DebugInfo debugInfo={debugInfo} isVisible={isScanning} />
          </section>

          {/* Backup Actions */}
          <BackupActions
            credentials={credentials}
            isBackingUp={isBackingUp}
            isScanning={isScanning}
            backupStatus={backupStatus}
            uploadDebugInfo={uploadDebugInfo}
            onBackup={handleBackup}
          />
        </main>
      </div>
    </>
  );
};

export default App;
