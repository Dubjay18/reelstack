module.exports = {
  expo: {
    name: "Reelstack",
    slug: "reelstack-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "reelstack",
    userInterfaceStyle: "dark",
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.reelstack.app"
    },
    android: {
      package: "com.reelstack.app",
      adaptiveIcon: {
        backgroundColor: "#131315",
        foregroundImage: "./assets/images/android-icon-foreground.png"
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#131315",
          image: "./assets/images/splash-icon.png",
          imageWidth: 200
        }
      ],
      "expo-secure-store",
      "expo-sharing"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      apiUrl: process.env.API_URL || "http://localhost:8080"
    }
  }
};
