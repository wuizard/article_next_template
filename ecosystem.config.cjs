/**
 * PM2 process definitions.
 *
 * Must be .cjs — package.json sets "type": "module", so a .js config would be
 * parsed as ESM and PM2 would reject it.
 *
 *   npm ci && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup       # survive reboots
 *
 * Secrets and content settings are NOT duplicated here — every process reads
 * .env itself. Keep .env at chmod 600.
 */
module.exports = {
  apps: [
    {
      // Public site. Read-only, no auth, no API key.
      name: "journal-site",
      // The CLI directly rather than `npm run start`, so PM2 supervises node
      // instead of an npm wrapper and signals reach the right process.
      script: "./node_modules/vinext/dist/cli.js",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "500M",
      time: true,
    },

    {
      // Review panel. Binds to 127.0.0.1 and answers only to the hostnames in
      // ADMIN_ALLOWED_HOSTS. Never publish this port.
      name: "journal-admin",
      script: "./scripts/admin/server.mjs",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "300M",
      time: true,
    },

    {
      // Nightly drafting. Runs, writes to content/drafts/, exits.
      // autorestart:false + cron_restart is PM2's one-shot pattern — without
      // it PM2 would treat the exit as a crash and loop the generator.
      name: "journal-content",
      script: "./scripts/generate-content.mjs",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      autorestart: false,
      // 01:00 server time. Set TZ below if the server is not on Bali time.
      cron_restart: "0 1 * * *",
      env_production: {
        TZ: "Asia/Makassar",
      },
      time: true,
    },
  ],
};
