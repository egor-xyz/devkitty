// Search shouldn't care which keyboard layout is active. When someone types on
// a non-Latin layout (Russian today), each character is mapped back to the
// Latin letter on the SAME physical key, so "рудз" matches "help". The two
// strings below are the QWERTY key positions in the same order — extend both to
// add another layout.
const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";

const layoutToQwerty: Record<string, string> = Object.fromEntries(
  Array.from(RU).map((char, index) => [char, EN.charAt(index)])
);

// Rewrites text as if the same physical keys were pressed on a US-QWERTY
// layout. Latin characters (and anything unmapped) pass through unchanged.
export const toEnglishLayout = (text: string): string =>
  Array.from(text.toLowerCase())
    .map((char) => layoutToQwerty[char] ?? char)
    .join('');
