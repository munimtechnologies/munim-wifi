#include <jni.h>
#include "MunimWifiOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::munimwifi::initialize(vm);
}
