import { createFileRoute } from "@tanstack/react-router"
import { Schema } from "effect"
import { SearchPage } from "../../features/search/search-page"
import { SearchParams } from "../../features/search/search-params"

export const Route = createFileRoute("/_app/search")({
  validateSearch: Schema.toStandardSchemaV1(SearchParams),
  component: SearchRoute,
})

function SearchRoute() {
  const { q } = Route.useSearch()
  return <SearchPage query={q ?? ""} />
}
