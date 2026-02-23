export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const toCamelCase = (s: string) =>
  s
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
