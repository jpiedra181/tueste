import type { CSSProperties } from 'react';
import { iconUrl, type IconName } from '@/lib/icons';

interface IconProps {
  name: IconName;
  /** px. Figma: icon-sm 16, icon-md 20, icon-lg 24 (también se usa 18). */
  size?: number;
  label?: string;
  className?: string;
}

/** Misma API que Icon.astro, para las islas de React. */
export function Icon({ name, size = 24, label, className }: IconProps) {
  const style = { '--icon': `url("${iconUrl(name)}")`, '--icon-size': `${size}px` } as CSSProperties;
  return (
    <span
      className={className ? `tueste-icon ${className}` : 'tueste-icon'}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
