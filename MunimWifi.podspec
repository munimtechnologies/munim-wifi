require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "MunimWifi"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/munimtechnologies/munim-wifi.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
    # Implementation (C++ objects)
    "cpp/**/*.{hpp,cpp}",
  ]

  load 'nitrogen/generated/ios/MunimWifi+autolinking.rb'
  add_nitrogen_files(s)

  # Add header search path for shared C++ headers
  # The generated iOS bridge files include headers like "ScanOptions.hpp"
  # which are located in nitrogen/generated/shared/c++/
  # Use USER_HEADER_SEARCH_PATHS for quoted includes (user headers)
  # Also add HEADER_SEARCH_PATHS as a fallback
  # Get the xcconfig that was set by add_nitrogen_files
  existing_xcconfig = s.attributes_hash['pod_target_xcconfig'] || {}
  current_user_header_paths = existing_xcconfig['USER_HEADER_SEARCH_PATHS'] || '$(inherited)'
  current_header_paths = existing_xcconfig['HEADER_SEARCH_PATHS'] || '$(inherited)'
  # Use SRCROOT which points to the pod's source directory
  # This works regardless of whether the pod is in node_modules or Pods/
  # This path is needed because iOS bridge files in nitrogen/generated/ios/
  # include headers from nitrogen/generated/shared/c++/ using quoted includes
  shared_header_path = '$(SRCROOT)/nitrogen/generated/shared/c++'
  s.pod_target_xcconfig = existing_xcconfig.merge({
    "USER_HEADER_SEARCH_PATHS" => "#{current_user_header_paths} \"#{shared_header_path}\"",
    "HEADER_SEARCH_PATHS" => "#{current_header_paths} \"#{shared_header_path}\""
  })

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
