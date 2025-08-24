
import * as React from "react"
import { cn } from "../../lib/utils"

// Main Card component
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string;
    actions?: React.ReactNode;
    icon?: React.ReactNode;
    bodyClassName?: string;
  }
>(({ className, children, title, actions, icon, bodyClassName, ...props }, ref) => {
  // If using new API with title/actions, render legacy format
  if (title || actions) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col",
          className
        )}
        {...props}
      >
        <div className="flex justify-between items-center px-4 py-3 border-b">
          {title && (
            <div className="flex items-center space-x-2">
              {icon && <span className="text-primary">{icon}</span>}
              <h3 className="text-base font-semibold">{title}</h3>
            </div>
          )}
          {actions && <div className="flex items-center space-x-2">{actions}</div>}
        </div>
        <div className={cn(bodyClassName || "p-4")}>
          {children}
        </div>
      </div>
    )
  }

  // Otherwise, render standard shadcn card
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export default Card
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }