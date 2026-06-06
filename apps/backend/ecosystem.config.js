module.exports = {
  apps: [
    {
      name: 'marketing-simulation-backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // The following secrets should be supplied by the host system environment
        DATABASE_URL: 'postgresql://username:password@hostname:5432/database?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379',
        BETTER_AUTH_SECRET: 'your_better_auth_secret_key_32_characters_long_min_size',
        BETTER_AUTH_URL: 'http://localhost:5000',
        FRONTEND_URL: 'http://localhost:3000',
        OLLAMA_HOST: 'http://127.0.0.1:11434',
        OLLAMA_MODEL: 'qwen2.5:7b',
      },
      // Log configuration
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      time: true,
    },
  ],
};
