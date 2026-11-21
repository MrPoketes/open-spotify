export function LoadingMessage({ children }: { readonly children: string }) {
  return <output className="text-sm text-muted">{children}</output>
}
