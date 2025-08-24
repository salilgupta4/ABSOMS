module.exports = {
  apps: [{
    name: 'abs-oms',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/adaptec.pro',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logging
    error_file: '/var/log/abs-oms/error.log',
    out_file: '/var/log/abs-oms/out.log',
    log_file: '/var/log/abs-oms/combined.log',
    time: true,
    
    // Memory and performance
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Restart policy
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Health monitoring
    health_check_http_port: 3001,
    health_check_grace_period: 3000
  }],

  deploy: {
    production: {
      user: 'root',
      host: '213.210.21.76',
      ref: 'origin/OMSSQL',
      repo: 'https://github.com/your-username/your-repo.git',
      path: '/var/www/adaptec.pro',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};