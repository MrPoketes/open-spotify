import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import type { FolderLocation } from "./folder-location"

export function FolderBreadcrumb({ folder, ancestors }: FolderLocation) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
        {ancestors.map((ancestor) => (
          <li key={ancestor.id} className="flex items-center gap-1">
            <Link
              to="/folder/$folderId"
              params={{ folderId: ancestor.id }}
              className="inline-flex min-h-6 items-center rounded-small transition-colors duration-120 ease-out hover:text-foreground hover:underline"
            >
              {ancestor.name}
            </Link>
            <ChevronRight aria-hidden size={16} />
          </li>
        ))}
        <li aria-current="page" className="font-semibold text-foreground">
          {folder.name}
        </li>
      </ol>
    </nav>
  )
}
