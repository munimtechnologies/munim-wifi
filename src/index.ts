import { NitroModules } from 'react-native-nitro-modules'
import type { MunimWifi as MunimWifiSpec } from './specs/munim-wifi.nitro'

export const MunimWifi =
  NitroModules.createHybridObject<MunimWifiSpec>('MunimWifi')