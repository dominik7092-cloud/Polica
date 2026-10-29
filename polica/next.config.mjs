import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl=createNextIntlPlugin('./i18n.ts');
export default withNextIntl({images:{remotePatterns:[{protocol:'https',hostname:'images.unsplash.com'}]}});
