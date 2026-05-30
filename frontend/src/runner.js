// Execute code through the free public Piston API (no API key required).
// https://github.com/engineer-man/piston
const PISTON = 'https://emkc.org/api/v2/piston';

let runtimesCache = null;

// Map our Monaco language ids -> Piston language names.
const LANG_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'c++',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
};

/** Languages we can actually execute (others are edit-only). */
export const RUNNABLE = new Set(Object.keys(LANG_MAP));

async function getRuntimes() {
  if (runtimesCache) return runtimesCache;
  const res = await fetch(`${PISTON}/runtimes`);
  if (!res.ok) throw new Error(`runtimes ${res.status}`);
  runtimesCache = await res.json();
  return runtimesCache;
}

/**
 * Run source code. Returns { ok, output, code }.
 * Never throws — failures come back as a printable message.
 */
export async function runCode(language, source) {
  const pistonLang = LANG_MAP[language];
  if (!pistonLang) {
    return {
      ok: false,
      output: `"${language}" can be edited here but not executed.\nRunnable: JavaScript, TypeScript, Python, Java, C++, C#, Go, Rust.`,
    };
  }
  if (!source.trim()) return { ok: false, output: '(nothing to run — the editor is empty)' };

  try {
    const runtimes = await getRuntimes();
    const rt = runtimes.find(
      (r) => r.language === pistonLang || (r.aliases || []).includes(pistonLang),
    );
    if (!rt) return { ok: false, output: `No runtime available for ${language}.` };

    const res = await fetch(`${PISTON}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: rt.language,
        version: rt.version,
        files: [{ content: source }],
      }),
    });
    if (!res.ok) return { ok: false, output: `Execution service error (HTTP ${res.status}).` };

    const data = await res.json();
    const run = data.run || {};
    const text = `${run.stdout || ''}${run.stderr || ''}`.trim();
    return { ok: run.code === 0, output: text || '(no output)', code: run.code };
  } catch (err) {
    return { ok: false, output: `Could not reach the execution service.\n${err.message}` };
  }
}
