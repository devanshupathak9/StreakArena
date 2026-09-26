import { AtSign, CalendarDays, FileText, MapPin, Pencil, UserRound, Users } from "lucide-react";
import type { User } from "../../lib/api";

type Props = { user: User; peers: number | null; onEdit: () => void };

export default function AboutMe({ user, peers, onEdit }: Props) {
  const rows = [
    { icon: AtSign, label: "Username", value: `@${user.username}` },
    { icon: UserRound, label: "Name", value: user.displayName || "—" },
    { icon: FileText, label: "Bio", value: user.bio || "—", wrap: true },
    { icon: MapPin, label: "Location", value: user.location || "—" },
    {
      icon: CalendarDays,
      label: "Joined",
      value: new Date(user.createdAt).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    },
    {
      icon: Users,
      label: "You race",
      value: `${peers ?? 0} ${peers === 1 ? "person" : "people"}`,
    },
  ];

  return (
    <section className="card">
      <div className="card-head">
        <h2>About me</h2>
        <button
          type="button"
          className="icon-button icon-button-sm"
          onClick={onEdit}
          aria-label="Edit your profile"
          title="Edit profile"
        >
          <Pencil size={15} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>

      <dl className="about-rows">
        {rows.map(({ icon: Icon, label, value, wrap }) => (
          <div key={label} className="about-row">
            <dt>
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {label}
            </dt>
            <dd className={wrap ? "about-wrap" : undefined}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
