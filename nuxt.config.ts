// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  devServer: { port: 5109 },

  /**
   * Everything here is read at runtime. Override with environment variables:
   *   databaseUrl     -> NUXT_DATABASE_URL (DATABASE_URL is also accepted, see server/utils/db.ts)
   *   public.siteUrl  -> NUXT_PUBLIC_SITE_URL
   */
  runtimeConfig: {
    databaseUrl: '',
    rsvpRateLimit: 10,
    public: {
      siteUrl: '',
      siteName: 'gather',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'gather',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#4f46e5' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },

  nitro: {
    // SQL migrations are bundled into the server build so `.output/` is self-contained.
    serverAssets: [{ baseName: 'migrations', dir: './database/migrations' }],
  },

  typescript: { strict: true },
})
