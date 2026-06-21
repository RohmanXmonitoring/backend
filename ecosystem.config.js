// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'admin-backend',
    script: 'src/app.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true,
    wait_ready: true
  }]
};
