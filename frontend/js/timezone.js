/**
 * Timezone Utility for PhD NexusCare
 *
 * Server time is Bangladesh Standard Time (BST = UTC+6)
 * This utility converts server times to user's local timezone
 */

const TimezoneUtil = {
  // Server timezone (Bangladesh)
  SERVER_TIMEZONE: "Asia/Dhaka",

  /**
   * Convert server time (Bangladesh) to user's local time
   * @param {string} serverTimeString - ISO format time from server
   * @returns {Date} - Date object in user's local timezone
   */
  serverToLocal: function (serverTimeString) {
    if (!serverTimeString) return null;

    // Parse the server time assuming it's in Bangladesh timezone
    const serverDate = new Date(serverTimeString);
    return serverDate;
  },

  /**
   * Format datetime to user's local timezone
   * @param {string} serverTimeString - ISO format time from server
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} - Formatted time string
   */
  formatLocal: function (serverTimeString, options = {}) {
    if (!serverTimeString) return "";

    const date = new Date(serverTimeString);
    const defaultOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    const formatOptions = { ...defaultOptions, ...options };
    return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
  },

  /**
   * Format date only (no time)
   * @param {string} serverTimeString - ISO format time from server
   * @returns {string} - Formatted date string
   */
  formatDate: function (serverTimeString) {
    return this.formatLocal(serverTimeString, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: undefined,
      minute: undefined,
    });
  },

  /**
   * Format time only (no date)
   * @param {string} serverTimeString - ISO format time from server
   * @returns {string} - Formatted time string
   */
  formatTime: function (serverTimeString) {
    return this.formatLocal(serverTimeString, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      year: undefined,
      month: undefined,
      day: undefined,
    });
  },

  /**
   * Get relative time (e.g., "2 hours ago", "in 3 days")
   * @param {string} serverTimeString - ISO format time from server
   * @returns {string} - Relative time string
   */
  getRelativeTime: function (serverTimeString) {
    if (!serverTimeString) return "";

    const date = new Date(serverTimeString);
    const now = new Date();
    const diffMs = date - now;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (Math.abs(diffDays) > 7) {
      return this.formatDate(serverTimeString);
    } else if (Math.abs(diffDays) >= 1) {
      return diffDays > 0
        ? `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`
        : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
    } else if (Math.abs(diffHours) >= 1) {
      return diffHours > 0
        ? `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`
        : `${Math.abs(diffHours)} hour${
            Math.abs(diffHours) !== 1 ? "s" : ""
          } ago`;
    } else if (Math.abs(diffMins) >= 1) {
      return diffMins > 0
        ? `in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`
        : `${Math.abs(diffMins)} minute${
            Math.abs(diffMins) !== 1 ? "s" : ""
          } ago`;
    } else {
      return "just now";
    }
  },

  /**
   * Convert user's local time to server time (Bangladesh) for API calls
   * @param {Date} localDate - Date object in user's local timezone
   * @returns {string} - ISO format string for server
   */
  localToServer: function (localDate) {
    if (!localDate) return null;

    // JavaScript Date.toISOString() always returns UTC time
    // Server will interpret this correctly as it uses USE_TZ=True
    return localDate.toISOString();
  },

  /**
   * Get user's timezone name
   * @returns {string} - Timezone name (e.g., "America/New_York")
   */
  getUserTimezone: function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  },

  /**
   * Get timezone offset string (e.g., "GMT+6")
   * @returns {string} - Timezone offset
   */
  getTimezoneOffset: function () {
    const offset = -new Date().getTimezoneOffset();
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? "+" : "-";
    return `GMT${sign}${hours}${
      minutes > 0 ? ":" + minutes.toString().padStart(2, "0") : ""
    }`;
  },

  /**
   * Initialize timezone display on page
   * Adds timezone info to elements with data-time attribute
   */
  initTimezoneDisplay: function () {
    // Find all elements with data-time attribute
    document.querySelectorAll("[data-time]").forEach((element) => {
      const serverTime = element.getAttribute("data-time");
      const format = element.getAttribute("data-format") || "full";

      let displayTime;
      switch (format) {
        case "date":
          displayTime = this.formatDate(serverTime);
          break;
        case "time":
          displayTime = this.formatTime(serverTime);
          break;
        case "relative":
          displayTime = this.getRelativeTime(serverTime);
          break;
        default:
          displayTime = this.formatLocal(serverTime);
      }

      element.textContent = displayTime;
      element.title = `Your time: ${this.formatLocal(
        serverTime
      )}\nServer time (Bangladesh): ${new Date(serverTime).toLocaleString(
        "en-US",
        { timeZone: this.SERVER_TIMEZONE }
      )}`;
    });
  },
};

// Auto-initialize when DOM is ready
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    TimezoneUtil.initTimezoneDisplay();
  });
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = TimezoneUtil;
}
