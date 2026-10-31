# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Keep Pineapple Girls native call classes, services, receivers, activities
-keep class com.cosmosdigital.pineapplegirls.** { *; }
-keepclassmembers class com.cosmosdigital.pineapplegirls.** { *; }

# Keep React Native NativeModules & ReactMethods
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactMethod ** *;
}

# Keep Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }
-keepclassmembers class com.google.firebase.messaging.** { *; }
-keep class io.invertase.firebase.messaging.** { *; }
-keepclassmembers class io.invertase.firebase.messaging.** { *; }
