import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { ManagedRuntime } from "effect"

// Runs Effect programs from Electron callbacks. Every service the main
// process depends on is provided here, in one place.
export const mainRuntime = ManagedRuntime.make(NodeFileSystem.layer)
