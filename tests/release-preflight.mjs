import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

const failures = [];
const requireMatch = (condition, message) => { if (!condition) failures.push(message); };

requireMatch(!/<style\b/i.test(html), 'index.html must not contain inline style blocks');
requireMatch(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), 'index.html must not contain inline executable scripts');
requireMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']styles\.css["']/i.test(html), 'same-origin styles.css must be loaded');
requireMatch(/<script[^>]+src=["']app\.js["'][^>]+defer/i.test(html), 'same-origin deferred app.js must be loaded');
requireMatch(/name=["']referrer["'][^>]+content=["']no-referrer["']/i.test(html), 'no-referrer policy is required');

const csp = html.match(/http-equiv=["']Content-Security-Policy["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? '';
for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'none'",
  "connect-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "worker-src 'none'"
]) {
  requireMatch(csp.includes(directive), `CSP must include: ${directive}`);
}
requireMatch(!csp.includes("'unsafe-inline'"), "CSP must not allow unsafe-inline");
requireMatch(!csp.includes("'unsafe-eval'"), "CSP must not allow unsafe-eval");

const combined = `${html}\n${js}\n${css}`;
requireMatch(!/formspree\.io/i.test(combined), 'Formspree must not exist in the release candidate');
requireMatch(!/\bfetch\s*\(/.test(js), 'pilot intake must not execute fetch');
requireMatch(!/XMLHttpRequest|WebSocket|EventSource|sendBeacon/.test(js), 'pilot intake must not contain alternate network egress APIs');
requireMatch(!/localStorage|sessionStorage|indexedDB/i.test(js), 'pilot intake must not persist entered data');
requireMatch(/event\.preventDefault\(\)/.test(js), 'pilot submission must be intercepted locally');
requireMatch(/No information was sent or stored\./.test(js), 'fail-closed status must state that nothing was sent or stored');
requireMatch(!/Application received/i.test(combined), 'candidate must not falsely claim an application was received');

for (const id of ['first-name', 'email', 'organization']) {
  requireMatch(new RegExp(`<label[^>]+for=["']${id}["']`, 'i').test(html), `${id} requires an explicit label`);
  requireMatch(new RegExp(`<input[^>]+id=["']${id}["'][^>]+name=["'][^"']+["']`, 'i').test(html), `${id} requires an explicit name`);
}
requireMatch(/id=["']pilot-status["'][^>]+role=["']status["']/i.test(html), 'pilot status must be exposed as a live status region');
requireMatch(/type=["']submit["']/i.test(html), 'pilot status control must use explicit submit semantics');

for (const asset of ['logo.svg', 'LMmockup1.PNG', 'LMmockupdash.PNG']) {
  requireMatch(fs.existsSync(asset), `required local asset missing: ${asset}`);
}

if (failures.length) {
  console.error('LineMap-A release preflight FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('LineMap-A release preflight PASS');
console.log('No external pilot submission, no browser storage, strict same-origin/no-connect CSP, explicit labels/status, local assets present.');
