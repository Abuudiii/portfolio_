type Props = {
  className?: string;
  label?: string;
};

export default function Rule({ className = '', label }: Props) {
  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="h-px flex-1 bg-rule" />
        <span className="mono-label">{label}</span>
        <div className="h-px flex-1 bg-rule" />
      </div>
    );
  }
  return <div className={`h-px w-full bg-rule ${className}`} />;
}
