import { screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { Deferred, Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { mainProcessFailingOn } from "../../lib/main-process-failing-on"
import { renderScreen } from "../../lib/render-screen"
import { LoginScreen } from "./login-screen"

const mainProcessReplyingToLogIn = (logInReply: unknown): DesktopApi => ({
  invoke: () => Promise.resolve(logInReply),
})

// Like the real main process, a cancelled login replies with LoginCancelled.
const mainProcessWaitingForBrowser = (logInReply = Deferred.makeUnsafe<unknown>()): DesktopApi => {
  return {
    invoke: (channel) => {
      if (channel === ipcChannels.logIn) {
        return Effect.runPromise(Deferred.await(logInReply))
      }
      return Effect.runPromise(
        Deferred.succeed(logInReply, { _tag: "LoginCancelled" }).pipe(Effect.asVoid),
      )
    },
  }
}

describe("LoginScreen", () => {
  it("continues to the app after the login succeeds", async () => {
    const router = renderScreen(
      <LoginScreen sessionExpired={false} />,
      mainProcessReplyingToLogIn({ _tag: "LoggedIn" }),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Log in with Spotify" }))

    await waitFor(() => expect(router.state.location.pathname).toBe("/"))
  })

  it.each([
    [{ _tag: "LoginPortInUse" }, "Another program is using port 43821"],
    [{ _tag: "LoginDenied" }, "did not give Open Spotify access"],
    [{ _tag: "LoginStateMismatch" }, "did not belong to this login"],
    [{ _tag: "LoginTimedOut" }, "wrong Redirect URI in your Spotify app"],
    [{ _tag: "ClientIdMissing" }, "No Client ID is saved"],
    [
      { _tag: "LoginFailed", message: "Could not open the browser." },
      "Could not open the browser.",
    ],
  ])("explains the login error %o", async (logInReply, explanation) => {
    renderScreen(<LoginScreen sessionExpired={false} />, mainProcessReplyingToLogIn(logInReply))

    await userEvent.click(await screen.findByRole("button", { name: "Log in with Spotify" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(explanation)
  })

  it("says it waits for the browser and offers the login again after Cancel", async () => {
    renderScreen(<LoginScreen sessionExpired={false} />, mainProcessWaitingForBrowser())

    await userEvent.click(await screen.findByRole("button", { name: "Log in with Spotify" }))
    expect(screen.getByRole("status")).toHaveTextContent("Finish logging in in your browser")
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(await screen.findByRole("button", { name: "Log in with Spotify" })).toBeEnabled()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  // Starting the login disables the focused button and cancelling removes
  // the next one, either of which would drop a keyboard user's focus.
  it("keeps keyboard focus on the login controls while waiting and after Cancel", async () => {
    renderScreen(<LoginScreen sessionExpired={false} />, mainProcessWaitingForBrowser())
    const logInButton = await screen.findByRole("button", { name: "Log in with Spotify" })
    logInButton.focus()

    await userEvent.keyboard("{Enter}")
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    await waitFor(() => expect(logInButton).toHaveFocus())
  })

  it("says when Cancel fails and keeps waiting for the browser", async () => {
    renderScreen(
      <LoginScreen sessionExpired={false} />,
      mainProcessFailingOn(ipcChannels.cancelLogIn, mainProcessWaitingForBrowser()),
    )

    await userEvent.click(await screen.findByRole("button", { name: "Log in with Spotify" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("could not cancel the login")
    expect(screen.getByRole("status")).toHaveTextContent("Finish logging in in your browser")
  })

  // Otherwise the login could finish in the browser after the user saved a
  // different Client ID, and store a session for the old one.
  it("cancels the pending login when the user leaves the login screen", async () => {
    const logInReply = Deferred.makeUnsafe<unknown>()
    renderScreen(<LoginScreen sessionExpired={false} />, mainProcessWaitingForBrowser(logInReply))

    await userEvent.click(await screen.findByRole("button", { name: "Log in with Spotify" }))
    await userEvent.click(screen.getByRole("link", { name: "Change Client ID" }))

    await waitFor(() => expect(Deferred.isDoneUnsafe(logInReply)).toBe(true))
  })

  it("keeps waiting when Log in is double-clicked", async () => {
    renderScreen(<LoginScreen sessionExpired={false} />, mainProcessWaitingForBrowser())

    await userEvent.dblClick(await screen.findByRole("button", { name: "Log in with Spotify" }))

    expect(screen.getByRole("status")).toHaveTextContent("Finish logging in in your browser")
  })

  it("explains that the session expired", async () => {
    renderScreen(<LoginScreen sessionExpired />, mainProcessReplyingToLogIn({ _tag: "LoggedIn" }))

    expect(await screen.findByText(/Your Spotify session has expired/)).toBeInTheDocument()
  })
})
