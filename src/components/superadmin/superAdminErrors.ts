// Turns errors from super admin database calls into messages that are safe to show.
// Raw database errors (table names, SQL details) are never shown on screen.

const KNOWN_ERRORS: [RegExp, string][] = [
  [/could not find the function|schema cache|PGRST202/i, 'This part of the dashboard is not installed in the database yet.'],
  [/two-factor verification required/i, 'Your session needs a fresh authenticator code. Reload the page and verify again.'],
  [/super admin limit reached/i, 'Only 5 people can be super admins. Remove the role from someone first.'],
  [/unauthorized|sadmin access required|permission denied/i, 'You are not allowed to do this.'],
  [/failed to fetch|network/i, 'Could not reach the server. Check your connection and try again.']
];

export const friendlyError = (err: unknown, fallback: string): string => {
  const message =
    typeof err === 'string' ? err : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : '';
  for (const [pattern, text] of KNOWN_ERRORS) {
    if (pattern.test(message)) return text;
  }
  return fallback;
};
