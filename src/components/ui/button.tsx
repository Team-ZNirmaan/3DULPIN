import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary: 'bg-navy-700 text-white hover:bg-navy-800 shadow-sm',
  accent: 'bg-saffron-600 text-white hover:bg-saffron-700 shadow-sm',
  outline: 'border border-line bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger: 'bg-blocking text-white hover:brightness-95 shadow-sm',
  success: 'bg-success text-white hover:brightness-95 shadow-sm',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8rem] gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
  icon: 'h-9 w-9 justify-center',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
