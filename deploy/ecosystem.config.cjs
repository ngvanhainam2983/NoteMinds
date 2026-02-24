module.exports = {
  apps: [
    {
      name: 'notemind',
      script: 'index.js',
      cwd: '/opt/notemind/server',
      instances: 1,               // 1 instance for 1GB RAM
      exec_mode: 'fork',
      node_args: '--max-old-space-size=512',  // Limit Node memory
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '400M',  // Auto-restart if memory exceeds 400MB
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/opt/notemind/logs/error.log',
      out_file: '/opt/notemind/logs/out.log',
      merge_logs: true,
      autorestart: true,
      watch: false,
    },
  ],
};
