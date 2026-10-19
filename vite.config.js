import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Versión visible en Ajustes: la del package.json + el commit desplegado
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let build = (process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 7);
if (!build) { try { build = execSync('git rev-parse --short HEAD').toString().trim(); } catch { build = ''; } }

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(build) },
});
