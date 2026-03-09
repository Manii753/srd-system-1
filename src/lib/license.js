import 'server-only';
import license from '@maniidev/failsafe-license';

let initPromise = null;

async function ensureLicenseInit() {
  if (!initPromise) {
    initPromise = license
      .init({
        projectId: process.env.FAILSAFE_PROJECT_ID,
        secretKey: process.env.FAILSAFE_SECRET_KEY,
        disableAutoRevalidate: true,
      })
      .catch((error) => {
        initPromise = null;
        throw error;
      });
  }

  await initPromise;
}

function normalizeLicenseState(state) {
  return {
    valid: Boolean(state?.allow),
    grace: Boolean(state?.grace),
    graceDaysLeft:
      typeof state?.graceDaysLeft === 'number' ? state.graceDaysLeft : null,
    error: null,
  };
}

export async function getLicenseState() {
  await ensureLicenseInit();
  return license.ensureValid({ maxAgeMs: 5 * 60 * 1000 });
}

export async function getSafeLicenseStatus() {
  try {
    const state = await getLicenseState();
    
    return normalizeLicenseState(state);
  } catch {
    return {
      valid: false,
      grace: false,
      graceDaysLeft: null,
      error: 'Unable to validate license.',
    };
  }
}
