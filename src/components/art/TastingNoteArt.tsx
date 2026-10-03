/**
 * Ilustración de nota de cata (Figma "Tasting Note" 24:7209, parte "Illustration"): círculo
 * bg/surface de 104 px con el dibujo de 88 px centrado. Solo existen Blueberry, Jasmine y Bergamot.
 *
 * Notas sin ilustración propia: el mismo círculo con un disco del tono de la nota
 * (`illustration-*`) del tamaño del fruto principal de las ilustraciones (56 de 88, como la
 * bergamota). Sin icono: ninguno del sistema representa sabores (cacao, panela, lichi…) y
 * añadiría un significado equivocado. Es decorativo: el nombre de la nota va al lado.
 * Ocupa el ancho del contenedor (cuadrado).
 */
import type { Colorway } from '@/lib/schemas';
import { bergamotUrl, blueberryUrl, jasmineUrl } from './assets';

export interface TastingNoteArtProps {
  illustration?: 'blueberry' | 'jasmine' | 'bergamot' | undefined;
  tone: Colorway;
  className?: string;
}

const art = { blueberry: blueberryUrl, jasmine: jasmineUrl, bergamot: bergamotUrl };

const toneClass: Record<Colorway, string> = {
  terracotta: 'bg-illustration-terracotta',
  sage: 'bg-illustration-sage',
  ochre: 'bg-illustration-ochre',
  blue: 'bg-illustration-blue',
  plum: 'bg-illustration-plum',
  ink: 'bg-illustration-ink',
};

export function TastingNoteArt({ illustration, tone, className = '' }: TastingNoteArtProps) {
  return (
    <div aria-hidden="true" className={`relative aspect-square w-full overflow-hidden rounded-full bg-bg-surface ${className}`}>
      {illustration ? (
        // 88 de 104 → 7,69 % de margen a cada lado
        <img
          src={art[illustration]}
          alt=""
          width={88}
          height={88}
          loading="lazy"
          decoding="async"
          className="absolute inset-[7.6923%] size-[84.6154%] max-w-none"
        />
      ) : (
        // Disco de 56 de 104 (53,85 %), centrado
        <span className={`absolute inset-[23.0769%] rounded-full ${toneClass[tone]}`} />
      )}
    </div>
  );
}

export default TastingNoteArt;
