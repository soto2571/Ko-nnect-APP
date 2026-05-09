const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  expo: {
    name: "Ko-nnecta'",
    slug: 'ko-nnecta',
    scheme: 'konnecta',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.konnect.app',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store', 'expo-font'],
    extra: {
      supabaseUrl:          process.env.SUPABASE_URL,
      supabaseAnonKey:      process.env.SUPABASE_ANON_KEY,
      supabaseFunctionsUrl: process.env.SUPABASE_FUNCTIONS_URL,
    },
  },
};
