type NavigationDecision = "in-app" | "browser" | "blocked"

// Compares protocol and host rather than `origin`: Node reports the origin of
// a custom scheme such as `app://` as "null", which would match nothing.
export function decideNavigation(url: string, appUrl: string): NavigationDecision {
  const target = URL.parse(url)
  if (target === null) {
    return "blocked"
  }
  const app = new URL(appUrl)
  if (target.protocol === app.protocol && target.host === app.host) {
    return "in-app"
  }
  // Only https leaves the app, so a page cannot open local files or launch
  // another program's protocol handler.
  if (target.protocol === "https:") {
    return "browser"
  }
  return "blocked"
}
