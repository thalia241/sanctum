import { useState } from "react";
import { createPost } from "../../api/posts";
import UploadField from "../common/UploadField";

export default function PostComposer({
  slug,
  onCreated,
  membershipRole = "member",
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("members");
  const [postType, setPostType] = useState("standard");
  const [isPinned, setIsPinned] = useState(false);
  const [accessTierLabel, setAccessTierLabel] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canUseCreatorUpdate =
    membershipRole === "owner" || membershipRole === "mod";

  const canPinPosts =
    membershipRole === "owner" || membershipRole === "mod";

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const trimmedAccessTierLabel = accessTierLabel.trim();

    if (!trimmedTitle || !trimmedBody) {
      setError("Title and body are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await createPost(slug, {
        title: trimmedTitle,
        body: trimmedBody,
        visibility,
        postType: canUseCreatorUpdate ? postType : "standard",
        isPinned: canPinPosts ? isPinned : false,
        accessTierLabel: visibility === "subscribers" ? trimmedAccessTierLabel : "",
        coverImageUrl: coverImageUrl.trim(),
        embedUrl: embedUrl.trim(),
      });

      const post = data.post || data;

      setTitle("");
      setBody("");
      setVisibility("members");
      setPostType("standard");
      setIsPinned(false);
      setAccessTierLabel("");
      setCoverImageUrl("");
      setEmbedUrl("");

      if (onCreated) {
        onCreated(post);
      }
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err.message ||
          "Failed to create post"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Create Post</h3>
          <p className="mt-1 text-sm text-slate-400">
            Publish community posts, creator updates, supporter-only drops, images, and videos.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <label className="mb-2 block text-sm">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Weekly update"
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
        maxLength={200}
      />

      <label className="mb-2 block text-sm">Body</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your post..."
        className="mb-4 min-h-[140px] w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
        maxLength={10000}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm">Audience</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
          >
            <option value="members">Members only</option>
            <option value="public">Public</option>
            <option value="subscribers">Subscribers only</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm">Post Type</label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            disabled={!canUseCreatorUpdate}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none disabled:opacity-50"
          >
            <option value="standard">Standard post</option>
            <option value="creator_update">Creator update</option>
          </select>

          {!canUseCreatorUpdate ? (
            <p className="mt-1 text-xs text-slate-500">
              Creator updates are reserved for owners and moderators.
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <UploadField
          label="Post Cover Image"
          kind="cover"
          accept="image/*"
          value={coverImageUrl}
          onUploaded={setCoverImageUrl}
          helperText="Upload a thumbnail / hero image for the post."
        />

        <UploadField
          label="Attached Media"
          kind="media"
          accept="image/*,video/*"
          value={embedUrl}
          onUploaded={setEmbedUrl}
          helperText="Upload an image or video, or paste a YouTube / Spotify / SoundCloud / direct media URL."
        />
      </div>

      {visibility === "subscribers" ? (
        <div className="mt-4">
          <label className="mb-2 block text-sm">Supporter Tier Label</label>
          <input
            value={accessTierLabel}
            onChange={(e) => setAccessTierLabel(e.target.value)}
            placeholder="VIP, Backstage, Inner Circle..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 outline-none"
            maxLength={80}
          />
          <p className="mt-1 text-xs text-slate-500">
            Optional label shown on the post to clarify which supporters this is for.
          </p>
        </div>
      ) : null}

      {canPinPosts ? (
        <label className="mt-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium text-slate-100">Pin this post</div>
            <div className="text-xs text-slate-400">
              Keep it at the top of the community feed.
            </div>
          </div>
        </label>
      ) : null}

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
        {postType === "creator_update" ? (
          <p>
            This will be styled as a <span className="font-semibold text-violet-300">creator update</span>.
          </p>
        ) : (
          <p>
            This will be styled as a <span className="font-semibold text-slate-100">community post</span>.
          </p>
        )}

        {visibility === "public" ? (
          <p className="mt-1 text-slate-400">Anyone can view this if the public feed is enabled.</p>
        ) : null}

        {visibility === "members" ? (
          <p className="mt-1 text-slate-400">Only joined members can view this.</p>
        ) : null}

        {visibility === "subscribers" ? (
          <p className="mt-1 text-slate-400">Only active supporters and moderators can view this.</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-950 hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Posting..." : "Create Post"}
      </button>
    </form>
  );
} 