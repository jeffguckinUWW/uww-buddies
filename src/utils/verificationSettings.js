// Create this in src/utils/verificationSettings.js

// Local storage key for saving verification setting
const VERIFICATION_SETTING_KEY = 'uww-buddies-require-verification';

// Default setting (false means verification is disabled by default)
const DEFAULT_SETTING = false;

/**
 * Checks if email verification is required
 * @returns {boolean} Whether email verification is required
 */
export const getVerificationSetting = () => {
  const savedSetting = localStorage.getItem(VERIFICATION_SETTING_KEY);
  // If no saved setting, use default
  if (savedSetting === null) {
    return DEFAULT_SETTING;
  }
  // Convert string 'true'/'false' to boolean
  return savedSetting === 'true';
};

/**
 * Updates the email verification requirement setting
 * @param {boolean} value - Whether to require email verification
 */
export const setVerificationSetting = (value) => {
  localStorage.setItem(VERIFICATION_SETTING_KEY, value.toString());
};

/**
 * Toggles the email verification requirement setting
 * @returns {boolean} The new setting value
 */
export const toggleVerificationSetting = () => {
  const currentSetting = getVerificationSetting();
  const newSetting = !currentSetting;
  setVerificationSetting(newSetting);
  return newSetting;
};