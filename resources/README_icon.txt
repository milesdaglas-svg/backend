MLD Codes app icon - Circuit M design
--------------------------------------
Files:
- mld_icon_1024.png        -> full icon (bg + mark), use as the main/legacy icon
- mld_icon_foreground.png  -> mark only, transparent bg, use as adaptive icon foreground
- mld_icon_background.png  -> solid maroon (#3a1520), use as adaptive icon background

To regenerate all Android sizes automatically:
1. In your Capacitor Android project root, make a "resources" folder
2. Put mld_icon_1024.png there as resources/icon.png
3. Put mld_icon_foreground.png there as resources/icon-foreground.png
4. Put mld_icon_background.png there as resources/icon-background.png
5. Run:
   npm install @capacitor/assets --save-dev
   npx capacitor-assets generate --android
6. This writes all mipmap-* sizes into android/app/src/main/res automatically
7. Rebuild the APK (icon only updates on a rebuild, not live JS reload)
