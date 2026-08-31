/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  transpilePackages: [
    '@xforge/api',
    '@xforge/api-client',
    '@xforge/db',
    '@xforge/policy',
    '@xforge/hr',
  ],
}
