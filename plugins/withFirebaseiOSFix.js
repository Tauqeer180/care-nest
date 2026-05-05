const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Fixes @react-native-firebase build errors on iOS with Expo by:
 * 1. Adding $RNFirebaseAsStaticFramework = true at the top of the Podfile,
 *    which makes only Firebase pods build as static frameworks while leaving
 *    the rest of the app on regular pods (avoids modular header conflicts).
 * 2. Adding CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES to
 *    all targets as a safety net.
 */
const withFirebaseiOSFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let contents = fs.readFileSync(podfilePath, "utf8");

      // 1. Add static framework flag at the top
      const staticFlag = "$RNFirebaseAsStaticFramework = true";
      if (!contents.includes(staticFlag)) {
        contents = `${staticFlag}\n${contents}`;
      }

      // 1b. Enable modular headers for GoogleUtilities (required by Firebase Swift pods)
      const modularHeadersMarker = "# === FIREBASE_MODULAR_HEADERS ===";
      if (!contents.includes(modularHeadersMarker)) {
        const modularInjection = `
  ${modularHeadersMarker}
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'FirebaseInstallations', :modular_headers => true
`;
        // Insert inside the main target block (after `target ... do`)
        contents = contents.replace(
          /(target ['"][^'"]+['"] do\b[^\n]*\n)/,
          `$1${modularInjection}`
        );
      }

      // 2. Add post_install fix for non-modular headers
      const marker = "# === FIREBASE_NON_MODULAR_HEADERS_FIX ===";
      if (!contents.includes(marker)) {
        const fix = `
  ${marker}
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |bc|
      bc.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
  end
`;
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${fix}`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withFirebaseiOSFix;
