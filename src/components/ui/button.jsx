import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap text-app-text font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "h-6 px-2 py-0 bg-white text-blue-700 border border-white hover:bg-blue-50",
        destructive:
          "h-6 px-2 py-0 bg-white text-red-700 border border-white hover:bg-red-50",
        outline:
          "h-6 px-2 py-0 bg-white text-blue-700 border border-white hover:bg-blue-50",
        secondary:
          "h-6 px-2 py-0 bg-white text-gray-700 border border-white hover:bg-gray-50",
        ghost: "h-6 px-2 py-0 bg-white hover:bg-blue-50 hover:text-blue-700",
        link: "text-blue-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-6 px-2 py-0",
        sm: "h-6 px-2 py-0",
        lg: "h-7 px-3 py-0",
        icon: "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
