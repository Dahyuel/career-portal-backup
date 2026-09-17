// Copy text to the clipboard.
// The legacy execCommand path runs first, synchronously inside the click, because
// it also works where the async Clipboard API is blocked (plain HTTP, embedded
// previews/iframes without clipboard permission). The async API is the fallback.
const copyWithExecCommand = (text: string): boolean => {
  const active = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  // Must stay rendered (not display:none) for the selection to count
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '1px';
  textarea.style.height = '1px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    active?.focus?.({ preventScroll: true });
  }
};

export const copyText = async (text: string): Promise<boolean> => {
  if (copyWithExecCommand(text)) return true;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* blocked */
  }
  return false;
};

/** Selects an element's text so the user can press Ctrl+C when copying is blocked. */
export const selectElementText = (el: HTMLElement | null) => {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};
