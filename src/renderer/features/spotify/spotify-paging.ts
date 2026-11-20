import { Effect, Option, Schema, Stream } from "effect"

export const Paging = <ItemSchema extends Schema.Top>(item: ItemSchema) =>
  Schema.Struct({
    items: Schema.Array(item),
    next: Schema.NullOr(Schema.String),
    total: Schema.Number,
  })

export interface Page<A> {
  readonly items: ReadonlyArray<A>
  readonly next: string | null
}

// Spotify returns the absolute URL of the next page, so following `next`
// keeps every query parameter of the first request. This holds for cursor
// paging too (followed artists), where `next` already carries the `after`
// cursor.
export const streamPages = <A, E, R>(
  firstPageUrl: string,
  fetchPage: (url: string) => Effect.Effect<Page<A>, E, R>,
): Stream.Stream<A, E, R> =>
  Stream.paginate(firstPageUrl, (url) =>
    fetchPage(url).pipe(
      Effect.map((page) => [page.items, Option.fromNullishOr(page.next)] as const),
    ),
  )
