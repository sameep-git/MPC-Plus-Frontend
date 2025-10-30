// UI Constants
export const UI_CONSTANTS = {
  // Button text
  BUTTONS: {
    GENERATE_REPORT: 'Generate Report',
    VIEW_ALL_RESULTS: 'View All Results',
    VIEW_ALL_UPDATES: 'View All Updates',
    RETRY: 'Retry',
    SIGN_OUT: 'Sign Out',
  },
  
  // Labels
  LABELS: {
    MACHINE: 'Machine:',
    START_DATE: 'Start Date:',
    END_DATE: 'End Date:',
  },
  
  // Page titles
  TITLES: {
    MPC_RESULTS: 'MachineID MPC Results',
    WELCOME: 'Welcome',
    TODAYS_UPDATES: "Today's Machine Updates",
    LATEST_UPDATES: 'Latest Updates',
    RESULTS_SUMMARY: 'Results Summary for',
  },
  
  // Placeholder text
  PLACEHOLDERS: {
    WELCOME_DESCRIPTION: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla tortor.',
    MPC_RESULTS_DESCRIPTION: 'Subheading that sets up context, shares more info about the author, or generally gets people psyched to keep reading.',
    UPDATES_DESCRIPTION: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean nunc elit, iaculis in turpis at, porta fringilla quam.',
  },
  
  // Error messages
  ERRORS: {
    LOADING_DATA: 'Error loading data:',
    NO_MACHINES: 'No machines available',
    UNEXPECTED_ERROR: 'An unexpected error occurred',
  },
  
  // Status text
  STATUS: {
    LOADING: 'Loading...',
    USER: 'User',
  },
  
  // Check types
  CHECKS: {
    GEOMETRY_CHECK: 'Geometry Check',
    BEAM_CHECK: 'Beam Check',
  },

  // Update card icons
  UPDATE_ICON_TYPE: {
    INFO: 'INFO',
    SIGNOFF: 'SIGNOFF',
    THRESHOLD: 'THRESHOLD',
  },

  // Summary labels
  SUMMARY: {
    TOTAL_CHECKS: 'Total Checks:',
    GEOMETRY_CHECKS: 'Geometry Checks:',
    BEAM_CHECKS: 'Beam Checks:',
  },
} as const;

// Navigation Constants
export const NAVIGATION = {
  ROUTES: {
    HOME: '/',
    MPC_RESULT: '/results',
    RESULT_DETAIL: '/result-detail',
  },
  LINKS: {
    DASHBOARD: '#',
    MACHINES: '#',
    REPORTS: '#',
    SETTINGS: '#',
  },
} as const;

// API Constants
export const API_CONSTANTS = {
  DELAYS: {
    MACHINES: 1000,
    UPDATES: 500,
    USER: 200,
  },
  PROBABILITIES: {
    GEOMETRY_CHECK: 0.3,
    BEAM_CHECK: 0.4,
    WARNING_STATUS: 0.1,
  },
} as const;

// Calendar Constants
export const CALENDAR_CONSTANTS = {
  WEEK_DAYS: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  MIN_CALENDAR_HEIGHT: 80,
} as const;

// User Menu Actions
export const USER_MENU_ACTIONS = {
  PROFILE: 'profile',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  HELP: 'help',
  LOGOUT: 'logout',
} as const;
