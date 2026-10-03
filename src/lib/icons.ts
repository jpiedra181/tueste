/**
 * Iconos de Figma (Column / Assets · 24 px · trazo 1,5). Los SVG se usan sin modificar como
 * máscara CSS, así toman el color del texto (`currentColor`) y cualquier token de icon/*.
 */
const files = import.meta.glob<string>('/src/assets/icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

export type IconName =
  | 'alert-circle'
  | 'arrow-left'
  | 'arrow-right'
  | 'badge-check'
  | 'bag'
  | 'calendar'
  | 'check-circle'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'clock'
  | 'close'
  | 'coffee'
  | 'credit-card'
  | 'droplet'
  | 'edit'
  | 'expand'
  | 'filter'
  | 'flame'
  | 'gift'
  | 'globe'
  | 'heart'
  | 'info'
  | 'instagram'
  | 'leaf'
  | 'lock'
  | 'mail'
  | 'map-pin'
  | 'menu'
  | 'minus'
  | 'mountain'
  | 'package'
  | 'phone'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'store'
  | 'trash'
  | 'truck'
  | 'user'
  | 'wallet'
  | 'zoom-in';

const urls: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  urls[path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)] = url;
}

export function iconUrl(name: IconName): string {
  const url = urls[name];
  if (!url) throw new Error(`Icono desconocido: ${name}`);
  return url;
}
