import React, { useState, useEffect } from "react";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { MaterialSymbol } from "./MaterialSymbol";

interface DirectoryPickerProps {
  selectedPaths: string[];
  onPathsChange: (paths: string[]) => void;
  title: string;
}

interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  hasPhotos?: boolean;
}

const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  selectedPaths,
  onPathsChange,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Common photo directories to show as quick options
  const commonDirectories = [
    "/DCIM/Camera",
    "/DCIM",
    "/Pictures",
    "/Download",
    "/Screenshots",
    "/Photos",
  ];

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError("");

    try {
      // Try different directory contexts
      const directories = [
        Directory.ExternalStorage,
        Directory.Documents,
        Directory.Data,
      ];
      let result = null;

      for (const dir of directories) {
        try {
          result = await Filesystem.readdir({
            path: path === "/" ? "" : path,
            directory: dir,
          });
          break;
        } catch (err) {
          // Try next directory type if this one fails
        }
      }

      if (!result) {
        setError("Directory not accessible");
        setItems([]);
        setLoading(false);
        return;
      }

      const fileSystemItems: FileSystemItem[] = [];

      // Add parent directory option if not at root
      if (path !== "/") {
        const parentPath = path.split("/").slice(0, -1).join("/") || "/";
        fileSystemItems.push({
          name: ".. (Parent Directory)",
          path: parentPath,
          isDirectory: true,
        });
      }

      // Process files and directories
      for (const file of result.files) {
        const itemPath =
          path === "/" ? `/${file.name}` : `${path}/${file.name}`;

        // Check if it's a directory by trying to read it
        let isDirectory = false;
        let hasPhotos = false;

        try {
          const subResult = await Filesystem.readdir({
            path: itemPath.substring(1), // Remove leading slash
            directory: Directory.ExternalStorage,
          });
          isDirectory = true;

          // Check if directory contains photos
          hasPhotos = subResult.files.some((subFile) =>
            subFile.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|heic|webp)$/),
          );
        } catch {
          // It's a file or inaccessible directory
          isDirectory =
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|heic|webp)$/) ===
            null;
        }

        if (isDirectory) {
          fileSystemItems.push({
            name: file.name,
            path: itemPath,
            isDirectory: true,
            hasPhotos,
          });
        }
      }

      setItems(fileSystemItems);
      setCurrentPath(path);
    } catch (err) {
      console.error("Error loading directory:", err);
      setError(`Failed to load directory: ${path}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDirectory("/");
    }
  }, [isOpen]);

  const handleDirectoryClick = (item: FileSystemItem) => {
    if (item.isDirectory) {
      loadDirectory(item.path);
    }
  };

  const handleAddPath = (path: string) => {
    if (!selectedPaths.includes(path)) {
      onPathsChange([...selectedPaths, path]);
    }
  };

  const handleRemovePath = (path: string) => {
    onPathsChange(selectedPaths.filter((p) => p !== path));
  };

  const handleQuickAdd = (path: string) => {
    handleAddPath(path);
  };

  return (
    <div className="directory-picker">
      <div className="directory-picker-header">
        <label>{title}</label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="directory-picker-toggle"
        >
          <MaterialSymbol icon="folder" size={18} />{" "}
          {isOpen ? "Close Browser" : "Browse Directories"}
        </button>
      </div>

      {/* Selected paths display */}
      <div className="selected-paths">
        {selectedPaths.length === 0 ? (
          <div className="no-paths">No directories selected</div>
        ) : (
          selectedPaths.map((path) => (
            <div key={path} className="selected-path">
              <span className="path-text">
                <MaterialSymbol icon="folder_open" size={16} /> {path}
              </span>
              <button
                type="button"
                onClick={() => handleRemovePath(path)}
                className="remove-path-btn"
              >
                <MaterialSymbol icon="close" size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Quick add common directories */}
      <div className="quick-directories">
        <div className="quick-directories-title">
          Quick Add Common Directories:
        </div>
        <div className="quick-directories-grid">
          {commonDirectories.map((path) => (
            <button
              key={path}
              type="button"
              onClick={() => handleQuickAdd(path)}
              className={`quick-dir-btn ${selectedPaths.includes(path) ? "selected" : ""}`}
              disabled={selectedPaths.includes(path)}
            >
              <MaterialSymbol
                icon={selectedPaths.includes(path) ? "check_circle" : "folder"}
                size={16}
                color={selectedPaths.includes(path) ? "green" : undefined}
              />{" "}
              {path}
            </button>
          ))}
        </div>
      </div>

      {/* Directory browser */}
      {isOpen && (
        <div className="directory-browser">
          <div className="browser-header">
            <div className="current-path">
              <MaterialSymbol icon="location_on" size={16} /> Current:{" "}
              {currentPath}
            </div>
            <button
              type="button"
              onClick={() => handleAddPath(currentPath)}
              className="add-current-btn"
              disabled={selectedPaths.includes(currentPath)}
            >
              {selectedPaths.includes(currentPath) ? (
                <>
                  <MaterialSymbol icon="check_circle" size={16} color="green" />{" "}
                  Added
                </>
              ) : (
                <>
                  <MaterialSymbol icon="add" size={16} /> Add Current Directory
                </>
              )}
            </button>
          </div>

          {loading && <div className="loading">Loading directory...</div>}
          {error && <div className="error">{error}</div>}

          <div className="directory-list">
            {items.map((item) => (
              <div
                key={item.path}
                className={`directory-item ${item.hasPhotos ? "has-photos" : ""}`}
                onClick={() => handleDirectoryClick(item)}
              >
                <div className="item-icon">
                  <MaterialSymbol
                    icon={item.name.startsWith("..") ? "arrow_back" : "folder"}
                    size={20}
                  />
                  {item.hasPhotos && (
                    <span className="photo-indicator">
                      <MaterialSymbol icon="photo_camera" size={14} />
                    </span>
                  )}
                </div>
                <div className="item-details">
                  <div className="item-name">{item.name}</div>
                  {item.hasPhotos && (
                    <div className="item-hint">Contains photos</div>
                  )}
                </div>
                <div className="item-actions">
                  {!item.name.startsWith("..") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddPath(item.path);
                      }}
                      className="add-item-btn"
                      disabled={selectedPaths.includes(item.path)}
                    >
                      <MaterialSymbol
                        icon={
                          selectedPaths.includes(item.path)
                            ? "check_circle"
                            : "add"
                        }
                        size={16}
                        color={
                          selectedPaths.includes(item.path)
                            ? "green"
                            : undefined
                        }
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback textarea for manual entry */}
      <details className="manual-entry">
        <summary>Manual Path Entry</summary>
        <textarea
          value={selectedPaths.join("\n")}
          onChange={(e) =>
            onPathsChange(
              e.target.value.split("\n").filter((dir) => dir.trim()),
            )
          }
          rows={3}
          placeholder="/DCIM/Camera&#10;/Pictures&#10;/Download"
          className="manual-paths-textarea"
        />
      </details>
    </div>
  );
};

export default DirectoryPicker;
