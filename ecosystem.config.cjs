const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'forge-telegram',
      script: './node_modules/tsx/dist/cli.mjs',
      interpreter: '/Users/nick/.nvm/versions/node/v24.13.1/bin/node',
      args: 'apps/telegram/src/index.ts',
      cwd: ROOT,
      env: {
        NODE_ENV: 'production',
        FORGE_AUTONOMY_LEVEL: 'L4',
        FORGE_AUTONOMY_CONFIG_PATH: `${ROOT}/configs/autonomy.yaml`,
        FORGE_WORKSPACE_ROOT: ROOT,
      },
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'forge-dashboard',
      script: './node_modules/tsx/dist/cli.mjs',
      interpreter: '/Users/nick/.nvm/versions/node/v24.13.1/bin/node',
      args: 'apps/dashboard/src/server.ts',
      cwd: ROOT,
      env: {
        NODE_ENV: 'production',
        FORGE_AUTONOMY_LEVEL: 'L4',
        FORGE_AUTONOMY_CONFIG_PATH: `${ROOT}/configs/autonomy.yaml`,
        FORGE_WORKSPACE_ROOT: ROOT,
        FORGE_DASHBOARD_HOST: '127.0.0.1',
      },
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'forge-scheduler',
      script: './node_modules/tsx/dist/cli.mjs',
      interpreter: '/Users/nick/.nvm/versions/node/v24.13.1/bin/node',
      args: 'apps/scheduler/src/index.ts',
      cwd: ROOT,
      env: {
        NODE_ENV: 'production',
        FORGE_AUTONOMY_LEVEL: 'L4',
        FORGE_AUTONOMY_CONFIG_PATH: `${ROOT}/configs/autonomy.yaml`,
        FORGE_WORKSPACE_ROOT: ROOT,
      },
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
