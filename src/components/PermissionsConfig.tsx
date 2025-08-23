import React from "react";
import { MaterialSymbol } from "./MaterialSymbol";

interface PermissionsConfigProps {
  permissionsGranted: boolean;
  requestStoragePermissions: () => Promise<boolean>;
  checkStoragePermissions: () => Promise<boolean>;
}

const PermissionsConfig: React.FC<PermissionsConfigProps> = ({
  permissionsGranted,
  requestStoragePermissions,
  checkStoragePermissions,
}) => {
  const handleRequestPermissions = async () => {
    const granted = await requestStoragePermissions();
    if (!granted) {
      // Additional user feedback could be handled here
    }
  };

  return (
    <section className="config-section">
      <h2>
        <MaterialSymbol icon="lock" size={24} /> Storage Permissions
      </h2>
      <div className="permission-status">
        <p>
          {permissionsGranted ? (
            <span className="permission-granted">
              <MaterialSymbol icon="check_circle" size={18} color="green" />{" "}
              Storage permissions granted
            </span>
          ) : (
            <span className="permission-denied">
              <MaterialSymbol icon="cancel" size={18} color="red" /> Storage
              permissions required
            </span>
          )}
        </p>
        {!permissionsGranted && (
          <p className="permission-hint">
            The app needs access to your device storage to scan for photos and
            perform backups.
          </p>
        )}
      </div>
      <div className="permission-actions">
        <button
          onClick={handleRequestPermissions}
          className="permission-btn"
          disabled={permissionsGranted}
        >
          <MaterialSymbol icon="lock_open" size={18} />{" "}
          {permissionsGranted
            ? "Permissions Granted"
            : "Request Storage Access"}
        </button>
        <button onClick={checkStoragePermissions} className="refresh-btn">
          <MaterialSymbol icon="refresh" size={18} /> Check Permissions
        </button>
      </div>
    </section>
  );
};

export default PermissionsConfig;
