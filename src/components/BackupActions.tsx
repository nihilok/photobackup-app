import React from "react";
import { MaterialSymbol } from "./MaterialSymbol";
import { DebugInfo } from "./DebugInfo";
import { NextcloudCredentials } from "../types";

interface BackupActionsProps {
  credentials: NextcloudCredentials | null;
  isBackingUp: boolean;
  isScanning: boolean;
  backupStatus: string;
  uploadDebugInfo: string[];
  onBackup: () => Promise<void>;
}

export const BackupActions: React.FC<BackupActionsProps> = ({
  credentials,
  isBackingUp,
  isScanning,
  backupStatus,
  uploadDebugInfo,
  onBackup,
}) => {
  return (
    <section className="backup-section">
      <h2>
        <MaterialSymbol icon="cloud_upload" size={24} /> Backup Actions
      </h2>
      <button
        onClick={onBackup}
        disabled={isBackingUp || !credentials || isScanning}
        className="backup-btn"
      >
        {isBackingUp ? (
          <>
            <MaterialSymbol icon="hourglass_empty" size={18} /> Backing up...
          </>
        ) : (
          <>
            <MaterialSymbol icon="rocket_launch" size={18} /> Start Backup
          </>
        )}
      </button>

      {backupStatus && <div className="status-message">{backupStatus}</div>}

      <DebugInfo debugInfo={uploadDebugInfo} isVisible={isBackingUp} />
    </section>
  );
};
