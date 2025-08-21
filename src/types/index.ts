export interface NextcloudCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface BackupConfig {
  sourceDirectories: string[];
  targetDirectory: string;
}
