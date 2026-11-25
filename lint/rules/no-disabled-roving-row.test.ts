import { RuleTester } from "oxlint/plugins-dev"
import { describe, it } from "vitest"
import { noDisabledRovingRow } from "./no-disabled-roving-row.ts"

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester()

const validCases = [
  `interface DeviceChoiceProps { readonly rovingProps: RovingRowProps }
   function DeviceChoice({ rovingProps }: DeviceChoiceProps) {
     return <button type="button" {...rovingProps} aria-disabled={true} />
   }`,
  `<button type="button" disabled={isPending}>Submit</button>`,
  `interface RowProps { readonly rovingProps: RovingRowProps; readonly extra: ButtonProps }
   function Row({ rovingProps, extra }: RowProps) {
     return (
       <div>
         <a {...rovingProps}>Row</a>
         <button type="button" {...extra} disabled />
       </div>
     )
   }`,
  `function List() {
     const { rowProps } = useRovingFocus(2)
     return (
       <div>
         <a {...rowProps(0)}>Item</a>
         <button type="button" disabled>Action</button>
       </div>
     )
   }`,
  `function Local() {
     const useRovingFocus = () => ({ rowProps: () => ({ id: "a" }) })
     const { rowProps } = useRovingFocus()
     return <button type="button" {...rowProps()} disabled />
   }`,
  `import { useRovingFocus } from "./other-module"
   function ForeignHook() {
     const { rowProps } = useRovingFocus(2)
     return <button type="button" {...rowProps(0)} disabled />
   }`,
]

const invalidCases = [
  `interface DeviceChoiceProps { readonly rovingProps: RovingRowProps }
   function DeviceChoice({ rovingProps }: DeviceChoiceProps) {
     return <button type="button" {...rovingProps} disabled={true} />
   }`,
  `interface BaseProps { readonly rovingProps: RovingRowProps }
   interface ChildProps extends BaseProps { readonly label: string }
   function Row({ rovingProps }: ChildProps) {
     return <button type="button" {...rovingProps} disabled />
   }`,
  `function Row(props: RovingRowProps) {
     return <button type="button" {...props} disabled />
   }`,
  `interface OptionProps { readonly rovingProps: RovingRowProps }
   function Option(props: OptionProps) {
     const { rovingProps } = props
     return <button type="button" {...rovingProps} disabled />
   }`,
  `interface OptionProps { readonly rovingProps: RovingRowProps }
   function Option(props: OptionProps) {
     return <button type="button" {...props.rovingProps} disabled />
   }`,
  `function List() {
     const { rowProps } = useRovingFocus(2)
     return <button type="button" {...rowProps(0)} disabled />
   }`,
  `function List() {
     const roving = useRovingFocus(2)
     return <button type="button" {...roving.rowProps(0)} disabled />
   }`,
  `function Tree() {
     const itemProps = (index: number): TreeItemProps => ({ tabIndex: index })
     return <button type="button" {...itemProps(0)} disabled />
   }`,
  `interface NodeRowProps { readonly itemProps: TreeItemProps }
   function NodeRow({ itemProps }: NodeRowProps) {
     return <button type="button" {...itemProps} disabled />
   }`,
  `function List({ rows }: { readonly rows: ReadonlyArray<string> }) {
     return (
       <RovingList
         rows={rows}
         rowKey={(row) => row}
         className="flex flex-col"
         renderRow={(row, rovingProps) => <button {...rovingProps} disabled>{row}</button>}
       />
     )
   }`,
  `function Tree() {
     return <TreeView renderItem={(value, itemProps) => <button {...itemProps} disabled>{value}</button>} />
   }`,
  `import type { RovingRowProps as RowProps } from "../../ui/use-roving-focus"
   function Row({ row }: { readonly row: RowProps }) {
     return <button type="button" {...row} disabled />
   }`,
  `import { useRovingFocus as useListFocus } from "../../ui/use-roving-focus"
   function List() {
     const { rowProps } = useListFocus(2)
     return <button type="button" {...rowProps(0)} disabled />
   }`,
  `interface CustomRowProps extends RovingRowProps { readonly label: string }
   function Row({ label, ...rest }: CustomRowProps) {
     const merged = { ...rest, "aria-label": label }
     return <button type="button" {...merged} disabled />
   }`,
]

ruleTester.run("no-disabled-roving-row", noDisabledRovingRow, {
  valid: validCases.map((code) => ({ code, filename: "view.tsx" })),
  invalid: invalidCases.map((code) => ({
    code,
    filename: "view.tsx",
    errors: [{ messageId: "disabledRovingRow" }],
  })),
})
