# 📸 Photo Backup App

A mobile app built with Capacitor, React, and TypeScript that allows you to backup your device photos to a Nextcloud server with one-click simplicity.

## Features

✅ **Nextcloud Integration**: Store credentials securely and connect to your Nextcloud server
✅ **File System Access**: Access device photos from camera and other directories
✅ **Smart Backup**: Only uploads photos that don't already exist on the server
✅ **Configurable Directories**: Specify source directories on device and target directory on Nextcloud
✅ **Real-time Status**: Live backup progress and status updates
✅ **Modern UI**: Beautiful glassmorphism design optimized for mobile devices
✅ **Cross-platform**: Works on Android and iOS

## Tech Stack

- **Frontend**: React + TypeScript
- **Mobile Framework**: Capacitor
- **Build Tool**: Vite
- **Storage**: Capacitor Preferences (secure credential storage)
- **File Access**: Capacitor Filesystem
- **HTTP Requests**: Capacitor HTTP (for Nextcloud WebDAV API)

## Prerequisites

- Node.js 16+ and npm
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- A Nextcloud server with WebDAV access

## Installation & Setup

1. **Clone and install dependencies**:
   ```bash
   cd photobackup-app
   npm install
   ```

2. **Build the web app**:
   ```bash
   npm run build
   ```

3. **Sync with native platforms**:
   ```bash
   npx cap sync
   ```

## Development

### Run in browser (limited functionality)
```bash
npm start
```

### Run on Android
```bash
npx cap run android
```

### Run on iOS
```bash
npx cap run ios
```

## App Configuration

### Nextcloud Setup
1. Enter your Nextcloud server URL (e.g., `https://your-nextcloud.com`)
2. Provide your username and password
3. Tap "Save Credentials" to store securely

### Backup Configuration
1. **Source Directories**: Specify which device folders to backup from (default: `/DCIM/Camera`)
2. **Target Directory**: Set the Nextcloud folder to backup to (default: `/Photos/Backup`)

## Usage

1. **Configure Nextcloud credentials** in the app settings
2. **Set backup directories** (source on device, target on Nextcloud)
3. **Tap "Start Backup"** for one-click photo backup
4. Monitor real-time progress and status updates

## Permissions

The app requires the following permissions:

### Android
- `READ_EXTERNAL_STORAGE` - Access device photos
- `WRITE_EXTERNAL_STORAGE` - Manage photo files
- `CAMERA` - Camera access (future feature)
- `INTERNET` - Connect to Nextcloud server
- `ACCESS_NETWORK_STATE` - Check network connectivity

### iOS
- `NSPhotoLibraryUsageDescription` - Access photo library
- `NSCameraUsageDescription` - Camera access (future feature)

## Building for Production

### Android APK/AAB
```bash
npm run build
npx cap sync android
npx cap open android
```
Then build using Android Studio.

### iOS App
```bash
npm run build
npx cap sync ios
npx cap open ios
```
Then build using Xcode.

## Architecture

### Core Components
- **App.tsx**: Main application component with all backup logic
- **Nextcloud Integration**: WebDAV API communication for file operations
- **File Management**: Device file system access and photo enumeration
- **Secure Storage**: Encrypted credential storage using Capacitor Preferences

### Key Functions
- `checkNextcloudConnection()`: Validates server connectivity
- `getNextcloudFiles()`: Lists existing files on server
- `uploadPhotoToNextcloud()`: Uploads individual photos
- `performBackup()`: Orchestrates the complete backup process

## Future Enhancements

🔮 **Photo Browsing**: View photos with local/remote fallback
🔮 **Selective Backup**: Choose specific photos to backup
🔮 **Sync Scheduling**: Automatic periodic backups
🔮 **Compression Options**: Reduce file sizes before upload
🔮 **Progress Indicators**: Detailed upload progress bars
🔮 **Backup History**: Track previous backup sessions

## Troubleshooting

### Common Issues

**"Error accessing device photos"**
- Ensure storage permissions are granted
- Check that source directories exist on device

**"Failed to connect to Nextcloud"**
- Verify server URL format (include https://)
- Check username/password credentials
- Ensure Nextcloud server is accessible

**"Upload failed"**
- Check network connectivity
- Verify target directory exists on Nextcloud
- Ensure sufficient storage space on server

## Security Notes

- Credentials are stored securely using Capacitor Preferences
- All communication with Nextcloud uses HTTPS
- No credentials are logged or transmitted to third parties
- Local storage is encrypted by the device OS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both Android and iOS
5. Submit a pull request

## License

MIT License - feel free to use and modify for your needs.

---

**Ready to backup your photos securely?** 📱 ➡️ ☁️
