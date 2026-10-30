import type { CapacitorConfig } from '@capacitor/cli';
 
const config: CapacitorConfig = {
appId: 'com.polica.app',
appName: 'Polica',
webDir: 'mobile-shell',
 
server: {
url: 'https://polica.vercel.app/en',
},
};
 
export default config;