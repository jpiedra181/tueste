/** Timeline Item (Figma 24:7383): Completed | Current | Upcoming, con conector entre pasos. */
import timelineDot from '@/assets/checkout/timeline-dot.svg?url';
import { Icon } from '@/components/ui/Icon';
import type { Translator } from '@/i18n';

export type TimelineStatus = 'completed' | 'current' | 'upcoming';

export interface TimelineEntry {
  title: string;
  description: string;
  status: TimelineStatus;
}

export function Timeline({ entries, t }: { entries: TimelineEntry[]; t: Translator }) {
  return (
    <ol className="flex flex-col gap-6 lg:gap-8">
      {entries.map((entry, index) => {
        const last = index === entries.length - 1;
        return (
          <li key={entry.title} aria-current={entry.status === 'current' ? 'step' : undefined} className="flex gap-4">
            <span aria-hidden="true" className="flex shrink-0 flex-col items-center gap-1 self-stretch">
              {entry.status === 'completed' && (
                <span className="flex size-6 items-center justify-center rounded-full bg-action-primary text-icon-inverse">
                  <Icon name="check" size={12} />
                </span>
              )}
              {entry.status === 'current' && <img src={timelineDot} alt="" width={24} height={24} className="block size-6" />}
              {entry.status === 'upcoming' && <span className="size-6 rounded-full border border-border-strong bg-bg-surface" />}
              {!last && (
                <span
                  className={`w-0.5 flex-1 ${entry.status === 'completed' ? 'bg-border-selected' : 'bg-border-default'}`}
                />
              )}
            </span>
            <span className={`flex min-w-0 flex-1 flex-col gap-1 pt-0.5 ${last ? '' : 'pb-8'}`}>
              <span className={`type-label-l ${entry.status === 'upcoming' ? 'text-text-secondary' : 'text-text-primary'}`}>
                {entry.title}
                {entry.status !== 'upcoming' && (
                  <span className="sr-only">
                    , {entry.status === 'completed' ? t('a11y/step-completed') : t('a11y/step-current')}
                  </span>
                )}
              </span>
              <span className="type-body-s text-text-tertiary">{entry.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
