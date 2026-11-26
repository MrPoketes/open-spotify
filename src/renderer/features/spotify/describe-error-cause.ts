import { Predicate } from "effect"
import { HttpClientError } from "effect/http"

const candidateMessage = (value: unknown): string | null => {
  if (Predicate.isString(value)) {
    return value
  }
  if (value instanceof Error) {
    return value.message
  }
  if (Predicate.hasProperty(value, "message") && Predicate.isString(value.message)) {
    return value.message
  }
  return null
}

const messageOf = (value: unknown): string | null => {
  const trimmed = candidateMessage(value)?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

const httpClientErrorSummary = (error: HttpClientError.HttpClientError): string => {
  const { reason } = error
  if ("cause" in reason && reason.cause !== undefined) {
    const inner = messageOf(reason.cause)
    if (inner !== null) {
      return inner
    }
  }
  if ("description" in reason && reason.description !== undefined && reason.description !== "") {
    return reason.description
  }
  return error.message
}

export const describeErrorCause = (cause: unknown): string => {
  if (HttpClientError.isHttpClientError(cause)) {
    return httpClientErrorSummary(cause)
  }
  return messageOf(cause) ?? String(cause)
}
