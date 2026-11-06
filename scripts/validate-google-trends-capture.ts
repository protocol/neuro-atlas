import { validateTrendsBundle } from '../src/lib/field-velocity/google-trends-feed';

// Browser acquisition validates before writing any capture. Never echo source values.
async function main() {
  try {
    process.stdin.setEncoding('utf8');
    let body = '';
    let bytes = 0;
    for await (const chunk of process.stdin) {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 1_100_000) throw new Error('Capture too large');
      body += chunk;
    }
    validateTrendsBundle(JSON.parse(body));
  } catch {
    process.stderr.write('Google Trends source contract rejected capture.\n');
    process.exitCode = 1;
  }
}
void main();
