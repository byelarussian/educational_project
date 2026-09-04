import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Сборка фронтенда: Vite + плагин JSX/Fast Refresh для React. */
export default defineConfig({
  plugins: [react()],
})
