import { createFileRoute } from "@tanstack/react-router"
import { FolderPage } from "../../features/folders/folder-page"

export const Route = createFileRoute("/_app/folder/$folderId")({
  component: FolderRoute,
})

function FolderRoute() {
  const { folderId } = Route.useParams()
  // A new key starts a fresh page when the user goes from one folder to
  // another, such as through the breadcrumb.
  return <FolderPage key={folderId} folderId={folderId} />
}
