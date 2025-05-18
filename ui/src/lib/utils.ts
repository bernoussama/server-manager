import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formFieldErrorClass(hasError: boolean | undefined, baseClass?: string): string {
  return cn(
    baseClass || '',
    hasError ? 'border-destructive focus-visible:ring-destructive' : ''
  );
}
