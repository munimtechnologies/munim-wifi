// Nitrogen 0.36.x emits Swift that calls `.map` on std::vector<std::string>
// values. Under Xcode 26's Swift toolchain the CxxRandomAccessCollection
// conformance for that instantiation is unavailable, so `.map` does not
// compile. Rewrite those call sites to an explicit size()/subscript loop
// (direct C++ member imports that need no conformance). Idempotent — run
// after every `nitrogen` codegen.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = new URL('../nitrogen/generated/ios/swift/', import.meta.url).pathname
const MAP_CALL = /([A-Za-z0-9_.]+)\.map\(\{ __item in String\(__item\) \}\)/g
const HELPER_NAME = '__nitroVectorToStringArray'
const HELPER = `
@inline(__always)
fileprivate func ${HELPER_NAME}(_ __vector: margelo.nitro.munimwifi.bridge.swift.std__vector_std__string_) -> [String] {
  var __result: [String] = []
  let __count = Int(__vector.size())
  __result.reserveCapacity(__count)
  var __index = 0
  while __index < __count {
    __result.append(String(__vector[__index]))
    __index += 1
  }
  return __result
}
`

let patched = 0
for (const name of readdirSync(dir)) {
  if (!name.endsWith('.swift')) continue
  const file = join(dir, name)
  let src = readFileSync(file, 'utf8')
  if (src.includes(HELPER_NAME)) continue
  if (!MAP_CALL.test(src)) continue
  MAP_CALL.lastIndex = 0
  src = src.replace(MAP_CALL, `${HELPER_NAME}($1)`) + HELPER
  writeFileSync(file, src)
  patched++
}
console.log(`patch-nitrogen-swift: rewrote vector<string>.map in ${patched} file(s)`)
