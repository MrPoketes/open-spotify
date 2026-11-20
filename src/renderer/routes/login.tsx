import { createFileRoute } from "@tanstack/react-router"
import { Schema } from "effect"
import { LoginScreen } from "../features/login/login-screen"

const LoginSearch = Schema.Struct({ sessionExpired: Schema.optional(Schema.Boolean) })

export const Route = createFileRoute("/login")({
  validateSearch: Schema.toStandardSchemaV1(LoginSearch),
  component: LoginPage,
})

function LoginPage() {
  const { sessionExpired } = Route.useSearch()
  return <LoginScreen sessionExpired={sessionExpired === true} />
}
