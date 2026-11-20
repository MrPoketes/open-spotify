import { ManagedRuntime } from "effect"
import { DesktopBridge } from "./desktop-bridge"

// Runs Effect programs from React and router code. Every service the
// renderer depends on is provided here, in one place.
export const rendererRuntime = ManagedRuntime.make(DesktopBridge.layer)
