import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Ticket, Users } from "lucide-react";
import GroupDirectory from "../components/groups/GroupDirectory";
import GroupView from "../components/groups/GroupView";
import { CreateGroupModal, JoinGroupModal } from "../components/groups/GroupModals";
import { useAppData } from "../context/AppData";

/**
 * One page for the whole section: the directory stays put on the left while the
 * group on the right changes, so switching groups never costs you the list.
 */
export default function Groups() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { groups, reloadGroups } = useAppData();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  async function afterJoin(groupId: string) {
    setCreating(false);
    setJoining(false);
    await reloadGroups();
    navigate(`/groups/${groupId}`);
  }

  return (
    <div className="groups-shell">
      <GroupDirectory
        onCreate={() => setCreating(true)}
        onJoin={() => setJoining(true)}
        onJoined={(groupId) => navigate(`/groups/${groupId}`)}
      />

      {id ? (
        <GroupView key={id} id={id} />
      ) : (
        <div className="group-main">
          <div className="empty group-landing">
            <span className="group-avatar group-avatar-lg" aria-hidden="true">
              <Users size={26} strokeWidth={2} />
            </span>
            <h2>{groups && groups.length > 0 ? "Pick a group" : "No groups yet"}</h2>
            <p className="muted">
              {groups && groups.length > 0
                ? "Choose one on the left to see its board, its tasks and its chat."
                : "Create a group or join your friends to start competing."}
            </p>
            <div className="head-actions">
              <button type="button" className="button" onClick={() => setCreating(true)}>
                <Plus size={15} strokeWidth={2.6} aria-hidden="true" />
                Create group
              </button>
              <button type="button" className="button button-ghost" onClick={() => setJoining(true)}>
                <Ticket size={15} strokeWidth={2.2} aria-hidden="true" />
                Join with a code
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && <CreateGroupModal onClose={() => setCreating(false)} onDone={afterJoin} />}
      {joining && <JoinGroupModal onClose={() => setJoining(false)} onDone={afterJoin} />}
    </div>
  );
}
