"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  avatar?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

export function UserAvatar({ name, avatar, size = "sm", className }: UserAvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() ?? "?";

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300",
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
