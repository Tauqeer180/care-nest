const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Copies adi-registration.properties from the project root into
 * android/app/src/main/assets/ during the prebuild step.
 *
 * Required by Google Play Console for Android Developer Identity (ADI)
 * package name ownership verification.
 */
const withAdiRegistration = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const sourceFile = path.join(projectRoot, "adi-registration.properties");

      if (!fs.existsSync(sourceFile)) {
        console.warn(
          "[withAdiRegistration] adi-registration.properties not found in project root. Skipping."
        );
        return config;
      }

      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );
      fs.mkdirSync(assetsDir, { recursive: true });

      const destFile = path.join(assetsDir, "adi-registration.properties");
      fs.copyFileSync(sourceFile, destFile);

      console.log("[withAdiRegistration] Copied adi-registration.properties to Android assets.");
      return config;
    },
  ]);
};

module.exports = withAdiRegistration;
