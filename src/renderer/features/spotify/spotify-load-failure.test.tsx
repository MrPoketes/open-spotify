import { screen, waitFor, within } from "@testing-library/react"
import { Effect, Layer } from "effect"
import { HttpClient, HttpClientError } from "effect/http"
import { describe, expect, it } from "vitest"
import { AccessTokenUnavailable, SessionExpired } from "../../../shared/spotify-auth-replies"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { renderScreen } from "../../lib/render-screen"
import { useLoad } from "../../lib/use-load"
import { nowPlayingBarAlone } from "../playback/now-playing-bar-alone"
import { QueuePane } from "../queue/queue-pane"
import { scriptedSpotify, spotifyApiUsing } from "./scripted-spotify-api"
import { SpotifyAccessToken } from "./spotify-access-token"
import { SpotifyApi } from "./spotify-api"
import { spotifyDashboardUrl } from "./spotify-error-detail"
import { spotifyErrorBody } from "./spotify-fake-error-body"
import { SpotifyLoadFailure } from "./spotify-load-failure"

const loadCurrentUser = Effect.gen(function* () {
  const spotify = yield* SpotifyApi
  return yield* spotify.getCurrentUser
})

function CurrentUserLoader() {
  const { state, retry } = useLoad(loadCurrentUser, "Profile failed to load")
  if (state.status !== "failed") {
    return null
  }
  return (
    <SpotifyLoadFailure error={state.error} message="Your profile didn't load." onRetry={retry} />
  )
}

const offlineSpotify = () =>
  spotifyApiUsing(
    HttpClient.make((request) =>
      Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({
            request,
            cause: new TypeError("Failed to fetch"),
          }),
        }),
      ),
    ),
  )

const tokenRefreshFailureSpotify = (message: string) =>
  SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([
      Layer.succeed(
        HttpClient.HttpClient,
        HttpClient.make(() => Effect.die("should not send without a token")),
      ),
      Layer.succeed(SpotifyAccessToken, {
        get: Effect.fail(new AccessTokenUnavailable({ message })),
      }),
    ]),
  )

describe("SpotifyLoadFailure over fake HTTP responses", () => {
  it("shows the network detail line and Retry when Spotify cannot be reached", async () => {
    await renderScreen(<CurrentUserLoader />, fakeMainProcess(), offlineSpotify())

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Your profile didn't load.")
    expect(alert).toHaveTextContent("Network error: Failed to fetch")
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("shows Spotify's status and message with Retry on a 5xx response", async () => {
    const spotify = scriptedSpotify([
      {
        status: 501,
        body: JSON.stringify(spotifyErrorBody(501, "Service temporarily unavailable")),
      },
    ])
    await renderScreen(<CurrentUserLoader />, fakeMainProcess(), spotify.layer)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Your profile didn't load.")
    expect(alert).toHaveTextContent("Spotify answered 501: Service temporarily unavailable")
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("shows the decode detail line and Retry when Spotify sends an unreadable response", async () => {
    const spotify = scriptedSpotify([{ status: 200, body: JSON.stringify({ unexpected: true }) }])
    await renderScreen(<CurrentUserLoader />, fakeMainProcess(), spotify.layer)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Your profile didn't load.")
    expect(alert).toHaveTextContent("Spotify sent a response the app couldn't read.")
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("shows the token error detail line and Retry when token refresh is temporarily unavailable", async () => {
    await renderScreen(
      <CurrentUserLoader />,
      fakeMainProcess(),
      tokenRefreshFailureSpotify("Spotify could not refresh the session right now."),
    )

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Your profile didn't load.")
    expect(alert).toHaveTextContent("Spotify could not refresh the session right now.")
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument()
  })

  it("explains User Management, links the dashboard, and hides Retry on an unregistered-user 403", async () => {
    const spotify = scriptedSpotify([
      {
        status: 403,
        body: JSON.stringify(
          spotifyErrorBody(403, "User not registered in the Developer Dashboard"),
        ),
      },
    ])
    await renderScreen(<CurrentUserLoader />, fakeMainProcess(), spotify.layer)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Your profile didn't load.")
    expect(alert).toHaveTextContent(/User Management/)
    expect(alert).toHaveTextContent(
      "Spotify answered 403: User not registered in the Developer Dashboard",
    )
    expect(
      within(alert).getByRole("link", { name: "Spotify Developer Dashboard" }),
    ).toHaveAttribute("href", spotifyDashboardUrl)
    expect(within(alert).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  it("explains the Premium requirement, links the dashboard, and hides Retry on a Premium 403", async () => {
    const spotify = scriptedSpotify([
      {
        status: 403,
        body: JSON.stringify(
          spotifyErrorBody(403, "Active premium subscription required for the owner of the app."),
        ),
      },
    ])
    await renderScreen(<CurrentUserLoader />, fakeMainProcess(), spotify.layer)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(/Premium/)
    expect(alert).toHaveTextContent(
      "Spotify answered 403: Active premium subscription required for the owner of the app.",
    )
    expect(
      within(alert).getByRole("link", { name: "Spotify Developer Dashboard" }),
    ).toHaveAttribute("href", spotifyDashboardUrl)
    expect(within(alert).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  it("sends the user to login when Spotify answers 401", async () => {
    const spotify = scriptedSpotify([
      { status: 401, body: JSON.stringify(spotifyErrorBody(401, "The access token expired")) },
    ])
    const router = await renderScreen(<CurrentUserLoader />, fakeMainProcess(), spotify.layer)

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })
})

describe("NowPlayingBar and QueuePane failure details", () => {
  it("shows the failure detail line in the now-playing bar when polling fails", async () => {
    await renderScreen(nowPlayingBarAlone, fakeMainProcess(), offlineSpotify())

    expect(await screen.findByText("Can't reach Spotify right now.")).toBeInTheDocument()
    expect(screen.getByText("Network error: Failed to fetch")).toBeInTheDocument()
  })

  it("links the Spotify Developer Dashboard in the now-playing bar on a development-mode 403", async () => {
    const spotify = scriptedSpotify([
      {
        status: 403,
        body: "Check settings on developer.spotify.com/dashboard, the user may not be registered.",
      },
    ])
    await renderScreen(nowPlayingBarAlone, fakeMainProcess(), spotify.layer)

    expect(
      await screen.findByRole("link", { name: "Spotify Developer Dashboard" }),
    ).toHaveAttribute("href", spotifyDashboardUrl)
    expect(
      screen.getByText(
        "Spotify answered 403: Check settings on developer.spotify.com/dashboard, the user may not be registered.",
      ),
    ).toBeInTheDocument()
  })

  it("shows the failure detail line in the queue pane when the playback poll fails", async () => {
    await renderScreen(
      <QueuePane ref={{ current: null }} isOpen savedWidth={320} onClose={() => undefined} />,
      fakeMainProcess(),
      offlineSpotify(),
    )

    expect(await screen.findByText("Can't reach Spotify right now.")).toBeInTheDocument()
    expect(screen.getByText("Network error: Failed to fetch")).toBeInTheDocument()
  })

  it("shows the non-retryable dashboard notice in the queue pane on a development-mode 403", async () => {
    const spotify = scriptedSpotify([
      {
        status: 403,
        body: JSON.stringify(
          spotifyErrorBody(403, "User not registered in the Developer Dashboard"),
        ),
      },
    ])
    await renderScreen(
      <QueuePane ref={{ current: null }} isOpen savedWidth={320} onClose={() => undefined} />,
      fakeMainProcess(),
      spotify.layer,
    )

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent(
      "Spotify answered 403: User not registered in the Developer Dashboard",
    )
    expect(
      within(alert).getByRole("link", { name: "Spotify Developer Dashboard" }),
    ).toHaveAttribute("href", spotifyDashboardUrl)
    expect(within(alert).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument()
  })

  it("sends the user to login when the playback poll gets SessionExpired", async () => {
    const router = await renderScreen(
      nowPlayingBarAlone,
      fakeMainProcess(),
      SpotifyApi.layerWithoutHttpClient.pipe(
        Layer.provide([
          Layer.succeed(
            HttpClient.HttpClient,
            HttpClient.make(() => Effect.die("should not send without a token")),
          ),
          Layer.succeed(SpotifyAccessToken, { get: Effect.fail(new SessionExpired()) }),
        ]),
      ),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(router.state.location.search).toEqual({ sessionExpired: true })
  })
})
