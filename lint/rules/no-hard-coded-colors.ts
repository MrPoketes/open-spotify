import { defineRule } from "@oxlint/plugins"
import type { ESTree } from "@oxlint/plugins"

// Hex colors and CSS color functions, including inside Tailwind arbitrary
// values such as `bg-[#123456]`. The `&` lookbehind keeps HTML character
// references like `&#123;` from reading as colors, and the lookahead keeps
// anchors that start with hex letters, like `#add-to-folder`, from matching.
const colorLiteral =
  /(?<![&\w])#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi

const paletteColors = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
]

const colorUtilities = [
  "bg",
  "text",
  "border",
  "border-x",
  "border-y",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-s",
  "border-e",
  "outline",
  "ring",
  "ring-offset",
  "inset-ring",
  "divide",
  "fill",
  "stroke",
  "accent",
  "caret",
  "decoration",
  "placeholder",
  "shadow",
  "inset-shadow",
  "drop-shadow",
  "text-shadow",
  "from",
  "via",
  "to",
]

const paletteClass = new RegExp(
  `^(?:${colorUtilities.join("|")})-(?:(?:${paletteColors.join("|")})-\\d{2,3}|black|white)(?:/\\S+)?$`,
)

// Themes can restyle only what reads a theme token. A color written into a
// component, or one of Tailwind's palette classes, stays the same in every
// theme. Colors are defined once, as the theme tokens in src/shared/theme.ts.
export const noHardCodedColors = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow colors that bypass the theme tokens" },
    messages: {
      colorLiteral:
        'Hard-coded color "{{color}}" ignores the theme. Use a theme token class such as bg-surface or text-accent.',
      paletteClass:
        'Tailwind palette class "{{className}}" ignores the theme. Use a theme token class such as bg-surface or text-accent.',
    },
  },
  create(context) {
    function reportHardCodedColors(node: ESTree.Node, text: string) {
      for (const [color] of text.matchAll(colorLiteral)) {
        context.report({ node, messageId: "colorLiteral", data: { color } })
      }
      for (const className of text.split(/\s+/)) {
        if (paletteClass.test(utilityName(className))) {
          context.report({ node, messageId: "paletteClass", data: { className } })
        }
      }
    }
    return {
      Literal(node) {
        if (typeof node.value === "string") {
          reportHardCodedColors(node, node.value)
        }
      },
      TemplateElement(node) {
        reportHardCodedColors(node, node.value.raw)
      },
    }
  },
})

// Tailwind 3 writes the important flag before the utility (`!bg-red-500`)
// and Tailwind 4 after it (`bg-red-500!`); both still apply the class.
function utilityName(className: string): string {
  const withoutVariants = className.slice(className.lastIndexOf(":") + 1)
  return withoutVariants.replaceAll("!", "")
}
