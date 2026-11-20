import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

// TanStack Start looks up this function by name to create the router.
export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Wraps every route in a Suspense boundary. The prerendered SPA shell
    // contains that boundary, so without it the first client render does not
    // match the shell and React reports a hydration error.
    defaultPendingComponent: () => null,
  })
}
