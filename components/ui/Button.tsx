
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Legacy variants for compatibility
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm sm:text-base",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8 text-base sm:text-lg",
        icon: "h-10 w-10",
        // Legacy sizes for compatibility
        md: "h-10 px-4 py-2 text-sm sm:text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  to?: string
  icon?: React.ReactNode
  shortcut?: string
  as?: React.ElementType
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, to, icon, shortcut, children, as, ...props }, ref) => {
    const Comp = asChild ? Slot : as || "button"
    
    const titleProp = shortcut ? { title: `Keyboard shortcut: ${shortcut}` } : {};
    
    const content = (
      <>
        {icon && <span className={children ? "mr-2 -ml-1" : ""}>{icon}</span>}
        {children}
        {shortcut && (
          <span className="ml-2 opacity-60 text-xs font-normal">
            {shortcut}
          </span>
        )}
      </>
    )

    if (to) {
      return (
        <Link
          to={to}
          className={cn(buttonVariants({ variant, size, className }))}
          {...titleProp}
        >
          {content}
        </Link>
      );
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...titleProp}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export default Button
export { Button, buttonVariants }