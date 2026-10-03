/**
 * Mapa de origen (Figma "Origin Map" 10:870): matriz de puntos de Etiopía (560 × 440) con el
 * marcador de Guji-Hambela, la capital, las coordenadas y los paralelos 10° N y 5° N.
 * Las etiquetas son texto real desde props; todo escala con el ancho (cqw, base 560).
 * Con `alt` (clave `art/alt-map`) es una imagen con nombre; sin él, decorativa.
 */
import { originMapUrl } from './assets';
import { cq, fraunces, imgRole } from './units';

export interface OriginMapProps {
  country: string;
  region: string;
  capital: string;
  coords: string;
  alt?: string | undefined;
  className?: string;
}

const u = cq(560);

/** Paralelos dibujados en la matriz (son del mapa, no del café): etiqueta y `top` en px. */
const LATITUDES = [
  ['10° N', 174],
  ['5° N', 324],
] as const;

export function OriginMap({ country, region, capital, coords, alt, className = '' }: OriginMapProps) {
  return (
    <div
      {...imgRole(alt)}
      className={`@container relative aspect-[560/440] w-full overflow-hidden rounded-md bg-bg-subtle select-none ${className}`}
    >
      <img
        src={originMapUrl}
        alt=""
        width={560}
        height={440}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full max-w-none"
      />

      <span
        className="absolute font-display font-light whitespace-nowrap text-text-primary italic"
        style={{ ...fraunces, left: u(372), top: u(34), fontSize: u(34), lineHeight: u(42), letterSpacing: '-0.01em' }}
      >
        {country}
      </span>

      {/* A la derecha del punto de la capital */}
      <span
        className="absolute font-sans font-medium whitespace-nowrap text-text-secondary"
        style={{ left: u(232.2), top: u(212.1), fontSize: u(12), lineHeight: u(16) }}
      >
        {capital}
      </span>

      {/* Etiqueta de la región, junto al marcador */}
      <span
        className="absolute flex flex-col items-start bg-bg-surface whitespace-nowrap"
        style={{
          left: u(242),
          top: u(293),
          gap: u(2),
          padding: `${u(6)} ${u(12)}`,
          borderRadius: u(4),
          // elevation-1 escalada
          boxShadow: `0 ${u(1)} ${u(2)} #15110e0f, 0 ${u(4)} ${u(12)} #15110e0f`,
        }}
      >
        <span className="font-sans font-semibold text-text-primary" style={{ fontSize: u(14), lineHeight: u(18) }}>
          {region}
        </span>
        <span className="font-mono font-normal text-text-tertiary" style={{ fontSize: u(12), lineHeight: u(16) }}>
          {coords}
        </span>
      </span>

      {LATITUDES.map(([label, top]) => (
        <span
          key={label}
          className="absolute font-mono font-normal whitespace-nowrap text-text-tertiary"
          style={{ left: u(12), top: u(top), fontSize: u(12), lineHeight: u(16) }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export default OriginMap;
