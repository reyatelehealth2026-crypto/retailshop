import { cn } from "@/utils/helpers";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text" | "card";
}

const Skeleton = ({ className, variant = "default", ...props }: SkeletonProps) => {
  const variants = {
    default: "rounded-md",
    circle: "rounded-full",
    text: "rounded h-4",
    card: "rounded-xl",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200",
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

// Product card skeleton
const ProductCardSkeleton = () => {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-3/4" variant="text" />
        <Skeleton className="h-3 w-1/2" variant="text" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16" variant="text" />
          <Skeleton className="h-8 w-8 rounded-full" variant="circle" />
        </div>
      </div>
    </div>
  );
};

// Product list skeleton
const ProductListSkeleton = ({ count = 4 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
};

export { Skeleton, ProductCardSkeleton, ProductListSkeleton };