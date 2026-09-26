import { CalendarDays, MapPin, Pencil, ShieldCheck, Users } from "lucide-react";
import type { User } from "../../lib/api";
import Avatar from "../Avatar";
import Scenery from "../ui/Scenery";

type Props = {
  user: User;
  peers: number | null;
  verified: boolean;
  onEdit: () => void;
  onEditPhoto: () => void;
};

function joined(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default function ProfileHero({ user, peers, verified, onEdit, onEditPhoto }: Props) {
  return (
    <header className="profile-hero">
      <Scenery variant="hero" />

      <div className="profile-hero-body">
        <div className="profile-portrait">
          <span className={verified ? "portrait-ring is-verified" : "portrait-ring"}>
            <Avatar
              username={user.username}
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              size={96}
            />
          </span>
          <button
            type="button"
            className="portrait-edit"
            onClick={onEditPhoto}
            aria-label="Change your photo"
            title="Change your photo"
          >
            <Pencil size={14} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <div className="profile-identity">
          <h1>
            {user.displayName || user.username}
            {verified && (
              /* Not identity verification — this app's badge means a platform has
                 confirmed at least one of your days. */
              <span
                className="verified-mark"
                title="A platform has verified at least one of your days"
              >
                <ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" />
                <span className="visually-hidden">Has verified streak days</span>
              </span>
            )}
          </h1>

          <p className="profile-handle">@{user.username}</p>

          {user.bio && <p className="profile-bio">{user.bio}</p>}

          <ul className="profile-meta">
            {user.location && (
              <li>
                <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                {user.location}
              </li>
            )}
            <li>
              <CalendarDays size={14} strokeWidth={2} aria-hidden="true" />
              Joined {joined(user.createdAt)}
            </li>
            <li>
              <Users size={14} strokeWidth={2} aria-hidden="true" />
              {peers ?? 0} {peers === 1 ? "person" : "people"} you race
            </li>
          </ul>
        </div>

        <div className="profile-hero-side">
          <button type="button" className="button" onClick={onEdit}>
            <Pencil size={15} strokeWidth={2.2} aria-hidden="true" />
            Edit profile
          </button>

          <figure className="hero-quote">
            <blockquote>“Discipline today creates a better you tomorrow.”</blockquote>
            <span className="hero-quote-rule" aria-hidden="true" />
          </figure>
        </div>
      </div>
    </header>
  );
}
