type ModalHeaderProps = {
  overline: string;
  title: string;
  text: string;
};

export function ModalHeader({
  overline,
  title,
  text,
}: ModalHeaderProps) {
  return (
    <header className="modal-head">
      <p className="eyebrow">{overline}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </header>
  );
}