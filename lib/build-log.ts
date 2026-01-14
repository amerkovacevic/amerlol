export interface BuildLogEntry {
  date: string
  title: string
  description: string
}

export const buildLog: BuildLogEntry[] = [
  {
    date: "2026-01-13",
    title: "Color Crafter",
    description: "Launched Color Crafter - a colorhunt.co-inspired platform for discovering, creating, and sharing beautiful color palettes. Features include public palette browsing with search, palette creation with 2-8 colors per palette (color picker, hex input, randomize), my palettes management, favorites system with Firestore persistence, copy individual colors or entire palettes, export palettes as JSON, edit and delete own palettes, like counts, and comprehensive settings for default colors, export formats, display preferences, and auto-copy functionality. All user data (favorites, settings, created palettes) stored in Firestore with authentication requirements. Public palettes are readable by all, but creation and management require authentication.",
  },
  {
    date: "2026-01-13",
    title: "Football Manager Team Picker",
    description: "Launched Football Manager Team Picker - a comprehensive tool for picking random Football Manager teams for solo play or group selection. Features include single and multiple team picking modes, filtering by country and league, same country/league constraints for group picks, minimum tier filtering, search functionality, favorites system with Firestore persistence, pick history tracking, and comprehensive settings for default preferences. All user data (favorites, history, settings) stored in Firestore with authentication requirements. Team data loaded from JSON template with support for optional fields.",
  },
  {
    date: "2026-01-13",
    title: "Secret Santa",
    description: "Launched Secret Santa app - a complete platform for organizing and managing Secret Santa gift exchanges. Features include exchange creation with name, description, budget, and date, participant management (join/leave), random name drawing by organizer, assignment reveal system for participants, custom fields support (text, number, select dropdowns) for exchange-specific information (e.g., jersey size for swaps), participant response collection and viewing for organizers, search functionality, and comprehensive settings. All data stored in Firestore with proper security rules. Organizers can view all participant responses to custom fields.",
  },
  {
    date: "2026-01-12",
    title: "UI/UX Improvements & Build Log System",
    description: "Implemented comprehensive UI improvements including logo integration across header, footer, hero section, and favicon. Refactored build log system to use shared data source, ensuring Latest Drops section automatically displays 4 most recent entries. Standardized all app settings to use toggle switches instead of checkboxes for better UX consistency. Fixed dev server routing issues with dynamic params configuration. Improved date selector styling in Pickup Soccer app.",
  },
  {
    date: "2026-01-12",
    title: "Pickup Soccer",
    description: "Launched Pickup Soccer app - an all-in-one platform for scheduling, joining, creating, and managing pickup soccer games. Features include game listing with search and date filters, game creation with location and player limits, join/leave functionality, player management, game deletion for creators, user display name validation, and comprehensive settings for default preferences, notifications, and data management. Integrated with Firestore for real-time game data and user authentication requirements.",
  },
  {
    date: "2026-01-12",
    title: "Time Zone Converter",
    description: "Launched Time Zone Converter utility - a comprehensive tool for comparing multiple time zones and converting times across the world. Features include real-time updates, day/night indicators, custom date/time selection, time zone search, and copy-to-clipboard functionality. Includes user settings for time format (12/24 hour), seconds display, day/night indicators, and auto-refresh preferences.",
  },
  {
    date: "2026-01-12",
    title: "Diff Checker",
    description: "Launched Diff Checker utility - a text comparison tool for finding differences between two text files. Features include side-by-side text input, file upload support, visual diff display with color-coded additions (green) and deletions (red), download diff results, and comprehensive settings for font size, line numbers, whitespace handling, and case sensitivity.",
  },
  {
    date: "2026-01-12",
    title: "Encryption Platform & Firebase Integration",
    description: "Launched the first mini-app - Encryption Platform with Base64, URL, Hex, Binary, ASCII, Caesar Cipher, ROT13, Morse Code, MD5, and SHA-256 encoding/decoding. Integrated Firebase Authentication (Google Sign-In and Email/Password) and Firestore for persistent user settings. Implemented authentication-gated settings with auto-convert, clear on tab change, default tab, and font size preferences.",
  },
]
