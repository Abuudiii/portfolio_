import BlurIn from './BlurIn';

type Props = {
  index: string;
  title: string;
  eyebrow?: string;
};

export default function SectionHeader({ index, title, eyebrow }: Props) {
  return (
    <BlurIn className="mb-10 md:mb-14">
      <div className="flex items-baseline gap-6">
        <span className="font-mono text-xs text-ember tracking-[0.14em]">{index}</span>
        <div className="h-px flex-1 bg-rule" />
        {eyebrow && (
          <span className="mono-label">{eyebrow}</span>
        )}
      </div>
      <h2 className="mt-6 font-bold tracking-tight text-display-md text-ink">{title}</h2>
    </BlurIn>
  );
}
