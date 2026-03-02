// PM2 Ecosystem Configuration for NoteMind
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'notemind-api',
      script: './index.js',
      cwd: '/var/www/notemind/server',
      instances: 1, // Can increase for load balancing
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto-restart configuration
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Resource limits
      max_memory_restart: '500M',
      
      // Monitoring
      watch: false, // Set to true in development only
      ignore_watch: ['node_modules', 'logs', 'data', 'uploads', 'exports'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Process management
      instance_var: 'INSTANCE_ID',
      
      // Cron restart (optional - restart daily at 3 AM)
      // cron_restart: '0 3 * * *',
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/NoteMind.git',
      path: '/var/www/notemind',
      'post-deploy': 'cd server && npm install && pm2 reload ecosystem.config.cjs --env production && cd ../client && npm install && npm run build',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
