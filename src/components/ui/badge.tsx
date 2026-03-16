import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/helpers";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-100 text-brand-700",
        secondary: "bg-orange-100 text-orange-700",
        destructive: "bg-red-100 text-red-700",
        success: "bg-green-100 text-green-700",
        warning: "bg-yellow-100 text-yellow-700",
        outline: "border border-gray-200 text-gray-700",
        // Product badges
        hot: "bg-red-500 text-white",
        new: "bg-green-500 text-white",
        sale: "bg-orange-500 text-white",
        bestseller: "bg-yellow-500 text-white",
        premium: "bg-purple-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
};

export { Badge, badgeVariants };