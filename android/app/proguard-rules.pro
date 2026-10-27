# Add project specific ProGuard rules here.

# These React Native native modules expose methods through the bridge and are
# accessed reflectively in release builds. Keep their download/video bridge
# classes so R8 cannot remove or rename the release download path.
-keep class com.rnfs.** { *; }
-keep class com.brentvatne.react.** { *; }
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
