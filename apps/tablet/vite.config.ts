import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative paths: the build works from any folder, e.g. Home Assistant's /local/paddock/
  base: './',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
})
