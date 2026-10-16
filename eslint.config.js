const { defineConfig, globalIgnores } = require('eslint/config')
const nextVitals = require('eslint-config-next/core-web-vitals')
module.exports = defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', 'out/**', 'dist/**', 'next-env.d.ts']),
  { rules: { 'react/no-unescaped-entities': 'off' } },
])
