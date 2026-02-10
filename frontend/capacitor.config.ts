import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heytime.mediahub',
  appName: 'MediaHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
