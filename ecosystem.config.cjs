// ecosystem.config.cjs — PM2 config para D+ARQ Dev Servers
// Uso:
//   pm2 start ecosystem.config.cjs    → arranca los 4 servidores en background
//   pm2 stop all                       → para todos (las URLs dejan de funcionar)
//   pm2 restart all                    → reinicia todos
//   pm2 status                         → tabla de estado
//   pm2 logs                           → logs de todos en tiempo real
//   pm2 logs webapp                    → logs solo de webapp

module.exports = {
  apps: [
    {
      name: 'webapp',
      cwd: './webapp',
      script: './node_modules/vite/bin/vite.js',
      args: '--port 5173 --host',
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'obras-client',
      cwd: './obras-client',
      script: './node_modules/vite/bin/vite.js',
      args: '--port 5174 --host',
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'agenda-client',
      cwd: './agenda-client',
      script: './node_modules/vite/bin/vite.js',
      args: '--port 5175 --host',
      env: { NODE_ENV: 'development' },
    },
    {
      name: 'inspeccion-client',
      cwd: './inspeccion-client',
      // inspeccion usa el vite del workspace root (hoisted)
      script: '../node_modules/vite/bin/vite.js',
      args: '--port 5176 --host',
      env: { NODE_ENV: 'development' },
    },
  ],
};
