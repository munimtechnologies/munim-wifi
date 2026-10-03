#include <jni.h>
#include <fbjni/fbjni.h>
#include "MunimWifiOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    // Registers every MunimWifi HybridObject and its JNI natives.
    margelo::nitro::munimwifi::registerAllNatives();
  });
}
