import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  rounded?: string;
  bgClassName?: string;
}

export default function Logo({ size = 36, className, rounded = "rounded-xl", bgClassName = "bg-white" }: LogoProps) {
  return (
    <div
      className={cn("flex items-center justify-center shrink-0 overflow-hidden", rounded, bgClassName, className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/novax.png"
        alt="NOVAX"
        width={size}
        height={size}
        className="object-contain w-full h-full"
      />
    </div>
  );
}