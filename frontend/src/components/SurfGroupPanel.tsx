import { FormEvent, useEffect, useState } from "react";
import type { SurfGroup, SurfInvite } from "../features/surf/types";

interface Props {
  groups: SurfGroup[];
  selectedGroupId: number | null;
  invitesByGroup: Record<number, SurfInvite | null>;
  creatingGroup: boolean;
  joiningByCode: boolean;
  creatingInvite: boolean;
  onSelectGroup: (id: number) => void;
  onCreateGroup: (name: string, description: string) => Promise<void>;
  onJoinByCode: (code: string) => Promise<void>;
  onCreateInvite: (groupId: number) => Promise<void>;
}

export function SurfGroupPanel({
  groups,
  selectedGroupId,
  invitesByGroup,
  creatingGroup,
  joiningByCode,
  creatingInvite,
  onSelectGroup,
  onCreateGroup,
  onJoinByCode,
  onCreateInvite
}: Props) {
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [crewOpen, setCrewOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(groups.length === 0);

  const selected = groups.find((group) => group.id === selectedGroupId) ?? null;

  useEffect(() => {
    if (groups.length === 0) {
      setCreateOpen(true);
    }
  }, [groups.length]);

  const submitGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) {
      return;
    }
    await onCreateGroup(groupName.trim(), groupDescription.trim());
    setGroupName("");
    setGroupDescription("");
  };

  const submitJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) {
      return;
    }
    await onJoinByCode(inviteCode.trim());
    setInviteCode("");
  };

  return (
    <aside className="card surf-sidebar">
      <div className="crew-header">
        <h2>Your Crew</h2>
        <button className="ghost crew-toggle" type="button" onClick={() => setCrewOpen((value) => !value)}>
          {crewOpen ? "Collapse" : "Expand"}
        </button>
      </div>
      {!crewOpen ? null : (
        <>
          {groups.length === 0 ? (
            <form onSubmit={submitGroup} className="stack-form">
              <label>
                New Group Name
                <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
              </label>
              <label>
                Description
                <textarea
                  value={groupDescription}
                  onChange={(event) => setGroupDescription(event.target.value)}
                  placeholder="Weekend dawn patrol team"
                />
              </label>
              <button type="submit" disabled={creatingGroup}>
                {creatingGroup ? "Creating..." : "Create group"}
              </button>
            </form>
          ) : (
            <div className="stack-form">
              <button className="ghost" type="button" onClick={() => setCreateOpen((value) => !value)}>
                {createOpen ? "Hide create form" : "Create another group"}
              </button>
              {createOpen ? (
                <form onSubmit={submitGroup} className="stack-form">
                  <label>
                    New Group Name
                    <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={groupDescription}
                      onChange={(event) => setGroupDescription(event.target.value)}
                      placeholder="Weekend dawn patrol team"
                    />
                  </label>
                  <button type="submit" disabled={creatingGroup}>
                    {creatingGroup ? "Creating..." : "Create group"}
                  </button>
                </form>
              ) : null}
            </div>
          )}

          <form onSubmit={submitJoin} className="stack-form">
            <label>
              Join by Invite Code
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="AB12CD34EF56"
              />
            </label>
            <button type="submit" disabled={joiningByCode}>
              {joiningByCode ? "Joining..." : "Join group"}
            </button>
          </form>

          <div className="group-list">
            {groups.map((group) => (
              <button
                key={group.id}
                className={`group-item ${selectedGroupId === group.id ? "active" : ""}`}
                onClick={() => onSelectGroup(group.id)}
              >
                <strong>{group.name}</strong>
                <small>{group.role}</small>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="invite-box">
              <button
                disabled={creatingInvite}
                onClick={() => onCreateInvite(selected.id)}
                className="ghost"
              >
                {creatingInvite ? "Generating..." : "Generate invite"}
              </button>
              {invitesByGroup[selected.id] ? (
                <p className="tiny">
                  Code: <code>{invitesByGroup[selected.id]?.code}</code>
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
