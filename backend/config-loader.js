// Load environment variables only if not in a test environment or if explicitly requested
// This avoids polluting the test state during normal Vitest runs
export async function loadEnv() {
  if (!process.env.VITEST || process.env.TRIGGER_DOTENV_LOAD) {
    try {
      const { default: dotenv } = await import('dotenv');
      dotenv.config();
      return true;
    } catch {
      // Ignore errors if dotenv is not present
    }
  }
  return false;
}
