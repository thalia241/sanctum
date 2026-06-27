import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { getUserProfile } from "../api/users";
import { useAuth } from "../context/AuthContext";
import { usePresence } from "../context/PresenceContext";
import GuestbookSection from "../components/profile/GuestbookSection";
import FriendActionBar from "../components/profile/FriendActionBar";
import TopFriendsSection from "../components/profile/TopFriendsSection";
import ProfileMusicWidget from "../components/profile/ProfileMusicWidget";
import ProfilePhotoShowcase from "../components/profile/ProfilePhotoShowcase";
import ProfileIdentitySection from "../components/profile/ProfileIdentitySection";
import ProfilePostsSection from "../components/profile/ProfilePostsSection";
import RemoteImage, { RemoteCover } from "../components/common/RemoteImage";
import PresencePill from "../components/common/PresencePill";

export default function ProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const { refreshPresence, getUserPresence } = usePresence();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const data = await getUserProfile(username);
        setProfile(data.user);

        if (data?.user?.id) {
          await refreshPresence([data.user.id]);
        }
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username]);

  const theme = profile?.theme || {};
  const isOwnProfile = String(user?.username || "") === String(profile?.username || "");
  const canPost = isOwnProfile || !isOwnProfile;
  const profilePresence = getUserPresence(profile?.id);

  return (
    <AppShell>
      {loading ? <p className="text-slate-400">Loading profile...</p> : null}
      {error ? <p className="text-red-300">{error}</p> : null}

      {!loading && !error && profile ? (
        <div className="mx-auto max-w-5xl">
          <div
            className="overflow-hidden rounded-3xl border border-slate-800"
            style={{ backgroundColor: theme.backgroundColor || "#020617" }}
          >
            <RemoteCover
              src={profile.bannerUrl}
              alt={`${profile.username} banner`}
              fallbackLabel={profile.displayName || profile.username}
              className="h-48 w-full object-cover"
              fallbackClassName="h-48 w-full"
            />

            <div className="px-6 pb-6">
              <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-end gap-4">
                  <RemoteImage
                    src={profile.avatarUrl}
                    alt={profile.username}
                    fallbackLabel={profile.displayName || profile.username}
                    className="h-24 w-24 rounded-2xl border-4 border-slate-950 object-cover"
                    fallbackClassName="h-24 w-24 rounded-2xl border-4 border-slate-950"
                    textClassName="text-2xl text-slate-500"
                  />

                  <div className="pb-2">
                    <h1
                      className="text-3xl font-bold"
                      style={{ color: theme.textColor || "#e2e8f0" }}
                    >
                      {profile.displayName || profile.username}
                    </h1>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-slate-400">@{profile.username}</p>
                      <PresencePill presence={profilePresence} />
                    </div>

                    {profile.status ? (
                      <p
                        className="mt-2 text-sm"
                        style={{ color: theme.accentColor || "#c084fc" }}
                      >
                        {profile.status}
                      </p>
                    ) : null}

                    <FriendActionBar
                      username={profile.username}
                      isOwnProfile={isOwnProfile}
                    />
                  </div>
                </div>

                {isOwnProfile ? (
                  <Link
                    to="/me/edit"
                    className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
                  >
                    Edit Profile
                  </Link>
                ) : null}
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-3">
                <section
                  className="rounded-2xl border border-slate-800 p-5 md:col-span-2"
                  style={{ backgroundColor: theme.panelColor || "#0f172a" }}
                >
                  <h2 className="mb-3 text-lg font-semibold">About Me</h2>
                  <p className="whitespace-pre-wrap text-sm text-slate-300">
                    {profile.bio || "No bio yet."}
                  </p>
                </section>

                <ProfileMusicWidget
                  favoriteSong={profile.favoriteSong}
                  accentColor={theme.accentColor || "#c084fc"}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ProfilePostsSection
              username={profile.username}
              isOwnProfile={isOwnProfile}
              currentUsername={user?.username || ""}
              canPost={canPost}
            />
          </div>

          <div className="mt-6">
            <ProfileIdentitySection
              interests={profile.interests || []}
              fandomTags={profile.fandomTags || []}
              badges={profile.badges || []}
            />
          </div>

          <div className="mt-6">
            <ProfilePhotoShowcase photos={profile.photoShowcase || []} />
          </div>

          <div className="mt-6">
            <TopFriendsSection topFriends={profile.topFriends || []} />
          </div>

          <div className="mt-6">
            <GuestbookSection
              username={profile.username}
              profileOwnerId={profile.id}
            />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
} 