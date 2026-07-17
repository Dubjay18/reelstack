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
        backgroundColor: "#17120e",
        foregroundImage: "./assets/images/android-icon-foreground.png"
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "reelstack"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#17120e",
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
      apiUrl: process.env.API_URL || "https://reelstack-bv9f.onrender.com",
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "0cc8e82a-96df-48a0-9ee4-e3df1532c776"
      }
    }
  }
};
