import { cn } from "@/lib/utils";

interface ContainerProps {
  size?: "default" | "narrow" | "wide";
  className?: string;
  children: React.ReactNode;
}

const maxWidths = {
  default: "max-w-[1440px]",
  narrow: "max-w-[896px]",
  wide: "max-w-[1600px]",
};

export function Container({
  size = "default",
  className,
  children,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 px-4 sm:px-6 md:px-12",
        maxWidths[size],
        className,
      )}
    >
      {children}
    </div>
  );
}
