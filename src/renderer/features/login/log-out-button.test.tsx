import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { LogOutButton } from "./log-out-button"

const mainProcessWithSession = (): DesktopApi => {
  let isLoggedIn = true
  return {
    invoke: (channel) => {
      if (channel === ipcChannels.logOut) {
        isLoggedIn = false
        return Promise.resolve(undefined)
      }
      return Promise.resolve(
        isLoggedIn
          ? { _tag: "AccessToken", accessToken: "my-access-token" }
          : { _tag: "NotLoggedIn" },
      )
    },
  }
}

describe("LogOutButton", () => {
  it("ends the session and goes to the login screen", async () => {
    const mainProcess = mainProcessWithSession()
    const router = await renderScreen(<LogOutButton />, mainProcess)

    await userEvent.click(await screen.findByRole("button", { name: "Log out" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    const accessTokenError = await Effect.runPromise(
      Effect.flip(DesktopBridge.make(mainProcess).getAccessToken),
    )
    expect(accessTokenError._tag).toBe("NotLoggedIn")
  })

  it("says when logging out fails and stays where it is", async () => {
    const router = await renderScreen(
      <LogOutButton />,
      mainProcessFailingOn(ipcChannels.logOut, mainProcessWithSession()),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Log out" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not log out")
    expect(router.state.location.pathname).toBe("/screen")
  })
})
