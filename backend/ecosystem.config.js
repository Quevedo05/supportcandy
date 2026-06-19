module.exports = {
  apps: [
    {
      name: 'supportcandy-api',
      script: './server.js',
      cwd: '/var/www/sistema/backend',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
