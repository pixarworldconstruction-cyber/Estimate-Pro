// Root-level (project-level) Gradle file (<project>/build.gradle.kts):
plugins {
  // ...
  // Add the dependency for the Google services Gradle plugin
  id("com.google.gms.google-services") version "4.4.2" apply false
}
