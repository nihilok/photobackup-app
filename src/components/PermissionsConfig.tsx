import React from 'react';

interface PermissionsConfigProps {
  permissionsGranted: boolean;
  requestStoragePermissions: () => Promise<boolean>;
  checkStoragePermissions: () => Promise<boolean>;
}

const PermissionsConfig: React.FC<PermissionsConfigProps> = ({
  permissionsGranted,
  requestStoragePermissions,
  checkStoragePermissions
}) => {
  const handleRequestPermissions = async () => {
    const granted = await requestStoragePermissions();
    if (!granted) {
      // Additional user feedback could be handled here
    }
  };

  return (
    <section className="config-section">
      <h2>🔐 Storage Permissions</h2>
      <div className="permission-status">
        <p>
          {permissionsGranted ? (
            <span className="permission-granted">✅ Storage permissions granted</span>
          ) : (
            <span className="permission-denied">❌ Storage permissions required</span>
          )}
        </p>
        {!permissionsGranted && (
          <p className="permission-hint">
            The app needs access to your device storage to scan for photos and perform backups.
          </p>
        )}
      </div>
      <div className="permission-actions">
        <button
          onClick={handleRequestPermissions}
          className="permission-btn"
          disabled={permissionsGranted}
        >
          🔓 {permissionsGranted ? 'Permissions Granted' : 'Request Storage Access'}
        </button>
        <button
          onClick={checkStoragePermissions}
          className="refresh-btn"
        >
          🔄 Check Permissions
        </button>
      </div>
    </section>
  );
};

export default PermissionsConfig;
