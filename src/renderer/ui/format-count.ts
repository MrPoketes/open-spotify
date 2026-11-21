const countFormat = new Intl.NumberFormat()

export const formatCount = (count: number, singular: string, plural: string) =>
  `${countFormat.format(count)} ${count === 1 ? singular : plural}`
