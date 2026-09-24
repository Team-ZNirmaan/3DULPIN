import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const Dropdown = DropdownPrimitive.Root
export const DropdownTrigger = DropdownPrimitive.Trigger

export function DropdownContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={sideOffset}
        className={cn('z-50 min-w-56 rounded-lg border border-line bg-white p-1 shadow-xl', className)}
        {...props}
      />
    </DropdownPrimitive.Portal>
  )
}

export function DropdownItem({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Item>) {
  return (
    <DropdownPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-start gap-2.5 rounded-md px-2.5 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-navy-50 data-[highlighted]:text-navy-800',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownLabel({ className, ...props }: ComponentProps<typeof DropdownPrimitive.Label>) {
  return <DropdownPrimitive.Label className={cn('px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500', className)} {...props} />
}

export const DropdownSeparator = (props: ComponentProps<typeof DropdownPrimitive.Separator>) => (
  <DropdownPrimitive.Separator className="my-1 h-px bg-line" {...props} />
)
