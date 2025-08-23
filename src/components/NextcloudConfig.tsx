import React, { useState } from "react";
import { NextcloudCredentials } from "../types";
import { CapacitorHttp } from "@capacitor/core";

interface NextcloudConfigProps {
  credentials: NextcloudCredentials | null;
  setCredentials: React.Dispatch<
    React.SetStateAction<NextcloudCredentials | null>
  >;
  saveCredentials: (creds: NextcloudCredentials) => Promise<void>;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    serverReachable: boolean;
    authValid: boolean;
    webdavAccess: boolean;
  };
}

const NextcloudConfig: React.FC<NextcloudConfigProps> = ({
  credentials,
  setCredentials,
  saveCredentials,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const testConnection = async () => {
    if (
      !credentials?.serverUrl ||
      !credentials?.username ||
      !credentials?.password
    ) {
      setTestResult({
        success: false,
        message: "Please fill in all fields before testing",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testDetails = {
        serverReachable: false,
        authValid: false,
        webdavAccess: false,
      };

      // Step 1: Test server reachability
      try {
        const serverUrl = credentials.serverUrl.split(/\/remote.php.+$/)[0];
        const statusResponse = await CapacitorHttp.get({
          url: `${serverUrl}/status.php`,
          headers: {
            Accept: "application/json",
          },
        });

        if (statusResponse.status === 200) {
          testDetails.serverReachable = true;
        }
      } catch (error) {
        setTestResult({
          success: false,
          message: "Server is not reachable. Please check the URL.",
          details: testDetails,
        });
        return;
      }

      // Step 2: Test authentication with WebDAV using GET instead of PROPFIND
      try {
        const serverUrl = credentials.serverUrl.replace(/\/$/, "");
        const webdavUrl = `${serverUrl}/remote.php/dav/files/${credentials.username}/`;

        // Use GET request instead of PROPFIND for compatibility
        const authResponse = await CapacitorHttp.get({
          url: webdavUrl,
          headers: {
            Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
          },
        });

        // WebDAV endpoints typically return 200 for GET requests or 401 for auth failures
        if (authResponse.status === 200 || authResponse.status === 207) {
          testDetails.authValid = true;
          testDetails.webdavAccess = true;

          setTestResult({
            success: true,
            message: "Connection test successful! All systems are working.",
            details: testDetails,
          });
        } else if (authResponse.status === 401) {
          setTestResult({
            success: false,
            message:
              "Authentication failed. Please check your username and password.",
            details: testDetails,
          });
        } else {
          setTestResult({
            success: false,
            message: `WebDAV access failed (Status: ${authResponse.status})`,
            details: testDetails,
          });
        }
      } catch (error) {
        setTestResult({
          success: false,
          message: `Failed to test WebDAV connection. Please verify your credentials.`,
          details: testDetails,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Unexpected error during connection test.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (credentials && testResult?.success) {
      await saveCredentials(credentials);
    } else if (credentials) {
      // Allow saving without testing, but warn user
      const confirmSave = window.confirm(
        "Configuration has not been tested successfully. Save anyway?",
      );
      if (confirmSave) {
        await saveCredentials(credentials);
      }
    }
  };

  const isFormValid =
    credentials?.serverUrl && credentials?.username && credentials?.password;

  return (
    <section className="config-section">
      <h2>🔧 Nextcloud Configuration</h2>

      <div className="form-group">
        <label>Server URL:</label>
        <input
          type="url"
          placeholder="https://your-nextcloud.com"
          value={credentials?.serverUrl || ""}
          onChange={(e) =>
            setCredentials((prev) => ({
              ...prev,
              serverUrl: e.target.value,
              username: prev?.username || "",
              password: prev?.password || "",
            }))
          }
        />
      </div>

      <div className="form-group">
        <label>Username:</label>
        <input
          type="text"
          placeholder="your-username"
          value={credentials?.username || ""}
          onChange={(e) =>
            setCredentials((prev) => ({
              ...prev,
              serverUrl: prev?.serverUrl || "",
              username: e.target.value,
              password: prev?.password || "",
            }))
          }
        />
      </div>

      <div className="form-group">
        <label>Password:</label>
        <input
          type="password"
          placeholder="your-password"
          value={credentials?.password || ""}
          onChange={(e) =>
            setCredentials((prev) => ({
              ...prev,
              serverUrl: prev?.serverUrl || "",
              username: prev?.username || "",
              password: e.target.value,
            }))
          }
        />
      </div>

      {/* Test Configuration Section */}
      <div className="test-section">
        <button
          onClick={testConnection}
          disabled={!isFormValid || isTesting}
          className={`test-btn ${isTesting ? "testing" : ""}`}
        >
          {isTesting ? "🔄 Testing Connection..." : "🧪 Test Configuration"}
        </button>

        {testResult && (
          <div
            className={`test-result ${testResult.success ? "success" : "error"}`}
          >
            <div className="test-message">
              {testResult.success ? "✅" : "❌"} {testResult.message}
            </div>

            {testResult.details && (
              <div className="test-details">
                <div
                  className={`test-step ${testResult.details.serverReachable ? "success" : "error"}`}
                >
                  {testResult.details.serverReachable ? "✅" : "❌"} Server
                  Reachable
                </div>
                <div
                  className={`test-step ${testResult.details.authValid ? "success" : "error"}`}
                >
                  {testResult.details.authValid ? "✅" : "❌"} Authentication
                  Valid
                </div>
                <div
                  className={`test-step ${testResult.details.webdavAccess ? "success" : "error"}`}
                >
                  {testResult.details.webdavAccess ? "✅" : "❌"} WebDAV Access
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={!isFormValid}
        className={`save-btn ${testResult?.success ? "verified" : ""}`}
      >
        {testResult?.success
          ? "💾 Save Verified Configuration"
          : "💾 Save Credentials"}
      </button>
    </section>
  );
};

export default NextcloudConfig;
