import type { TrackListDensity } from "../../../shared/track-list-density"

// Shared by the virtualiser, which positions rows by this height, and the
// rows themselves. Rows set it inline so a theme's spacing token cannot make
// the two disagree.
export const trackRowHeight: Record<TrackListDensity, number> = {
  comfortable: 48,
  dense: 32,
}
