import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

export function getInitials(name, fallback = "?") {
  if (!name || typeof name !== "string") return fallback;
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
