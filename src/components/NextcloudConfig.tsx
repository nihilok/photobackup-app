import React from 'react';
import { NextcloudCredentials } from '../types';

interface NextcloudConfigProps {
  credentials: NextcloudCredentials | null;
  setCredentials: React.Dispatch<React.SetStateAction<NextcloudCredentials | null>>;
  saveCredentials: (creds: NextcloudCredentials) => Promise<void>;
}

const NextcloudConfig: React.FC<NextcloudConfigProps> = ({
  credentials,
  setCredentials,
  saveCredentials
}) => {
  return (
    <section className="config-section">
      <h2>🔧 Nextcloud Configuration</h2>
      <div className="form-group">
        <label>Server URL:</label>
        <input
          type="url"
          placeholder="https://your-nextcloud.com"
          value={credentials?.serverUrl || ''}
          onChange={(e) => setCredentials(prev => ({
            ...prev,
            serverUrl: e.target.value,
            username: prev?.username || '',
            password: prev?.password || ''
          }))}
        />
      </div>
      <div className="form-group">
        <label>Username:</label>
        <input
          type="text"
          placeholder="your-username"
          value={credentials?.username || ''}
          onChange={(e) => setCredentials(prev => ({
            ...prev,
            serverUrl: prev?.serverUrl || '',
            username: e.target.value,
            password: prev?.password || ''
          }))}
        />
      </div>
      <div className="form-group">
        <label>Password:</label>
        <input
          type="password"
          placeholder="your-password"
          value={credentials?.password || ''}
          onChange={(e) => setCredentials(prev => ({
            ...prev,
            serverUrl: prev?.serverUrl || '',
            username: prev?.username || '',
            password: e.target.value
          }))}
        />
      </div>
      <button
        onClick={() => credentials && saveCredentials(credentials)}
        disabled={!credentials?.serverUrl || !credentials?.username || !credentials?.password}
        className="save-btn"
      >
        💾 Save Credentials
      </button>
    </section>
  );
};

export default NextcloudConfig;
