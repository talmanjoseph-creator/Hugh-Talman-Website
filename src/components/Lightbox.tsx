import { useCallback, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import YARLightbox, { type SlideImage, type SlotStyles } from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';

export interface FrameMeta {
  number: number;
  total: number;
  title: string;
  year: number | null;
  location: string | null;
  aspect: number;
  alt: string;
  src: string | null;
}

interface Props {
  slides: FrameMeta[];
  placeholder: boolean;
  children?: ReactNode;
}

const rootStyle: NonNullable<SlotStyles['root']> = {
  '--yarl__color_backdrop': 'rgba(255, 255, 255, 0.96)',
  '--yarl__color_button': '#555555',
  '--yarl__color_button_active': '#111111',
  '--yarl__color_button_disabled': '#d0d0d0',
};

function caption(meta: FrameMeta, placeholder: boolean) {
  const line = [meta.year, meta.location].filter(Boolean).join(' · ');
  const frame = placeholder ? `Frame ${String(meta.number).padStart(2, '0')} of ${meta.total}` : '';
  return { line, frame };
}

export default function Lightbox({ slides, placeholder, children }: Props) {
  const [index, setIndex] = useState(-1);

  const onClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const button = target?.closest<HTMLElement>('[data-lightbox-index]');
    if (!button) return;
    event.preventDefault();
    setIndex(Number(button.dataset.lightboxIndex));
  }, []);

  const close = useCallback(() => setIndex(-1), []);

  const yarlSlides = slides.map((meta) => ({ src: meta.src ?? '', meta })) as unknown as SlideImage[];

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      <div onClick={onClick}>{children}</div>
      <YARLightbox
        open={index >= 0}
        index={Math.max(index, 0)}
        close={close}
        slides={yarlSlides}
        carousel={{ finite: true, padding: '5%' }}
        controller={{ closeOnBackdropClick: true }}
        animation={reducedMotion ? { fade: 0, swipe: 0 } : { fade: 250, swipe: 250 }}
        styles={{ root: rootStyle, button: { filter: 'none' }, icon: { filter: 'none' } }}
        render={{
          buttonClose: () => (
            <button type="button" className="lightbox-close" onClick={close}>
              Close
            </button>
          ),
          slide: ({ slide }) => {
            const meta = (slide as unknown as { meta: FrameMeta }).meta;
            const { line, frame } = caption(meta, placeholder);

            return (
              <figure className="lightbox-figure">
                {meta.src ? (
                  <img className="lightbox-image" src={meta.src} alt={meta.alt} />
                ) : (
                  <div
                    className="lightbox-frame"
                    style={{ '--aspect': meta.aspect } as CSSProperties}
                  />
                )}
                <figcaption className="lightbox-caption">
                  <strong>{meta.title}</strong>
                  {line ? ` ${line}` : ''}
                  {frame ? ` · ${frame}` : ''}
                </figcaption>
              </figure>
            );
          },
        }}
      />
    </>
  );
}
