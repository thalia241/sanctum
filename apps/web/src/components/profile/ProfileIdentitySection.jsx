function BadgePill({ badge }) {
  return (
    <div
      className="rounded-full px-3 py-1 text-xs font-semibold"
      style={{
        backgroundColor: `${badge.color}22`,
        border: `1px solid ${badge.color}55`,
        color: badge.color,
      }}
    >
      {badge.label}
    </div>
  );
}

function TagPill({ children, subtle = false }) {
  return (
    <div
      className={`rounded-full px-3 py-1 text-sm ${
        subtle
          ? "border border-slate-700 bg-slate-950 text-slate-300"
          : "border border-slate-800 bg-slate-950 text-slate-200"
      }`}
    >
      {children}
    </div>
  );
}

export default function ProfileIdentitySection({
  interests = [],
  fandomTags = [],
  badges = [],
}) {
  const hasAnything = interests.length || fandomTags.length || badges.length;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Identity</h2>
        <p className="text-sm text-slate-400">
          Interests, fandoms, and profile badges.
        </p>
      </div>

      {!hasAnything ? (
        <p className="text-sm text-slate-400">Nothing added here yet.</p>
      ) : (
        <div className="space-y-5">
          {badges.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-300">Badges</h3>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <BadgePill key={`${badge.label}-${index}`} badge={badge} />
                ))}
              </div>
            </div>
          ) : null}

          {interests.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-300">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, index) => (
                  <TagPill key={`${interest}-${index}`}>{interest}</TagPill>
                ))}
              </div>
            </div>
          ) : null}

          {fandomTags.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-300">Fandom Tags</h3>
              <div className="flex flex-wrap gap-2">
                {fandomTags.map((tag, index) => (
                  <TagPill key={`${tag}-${index}`} subtle>
                    #{tag}
                  </TagPill>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
} 