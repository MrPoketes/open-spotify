import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router"
import type { ReactNode } from "react"
import appStylesUrl from "../styles/app.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Open Spotify" },
    ],
    links: [{ rel: "stylesheet", href: appStylesUrl }],
  }),
  // In SPA mode only the shell is prerendered; routes render on the client
  // inside it. Putting the page content here instead would cause a
  // hydration mismatch with the prerendered `_shell.html`.
  shellComponent: RootDocument,
})

function RootDocument({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
