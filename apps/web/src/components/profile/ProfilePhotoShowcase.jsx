import RemoteImage from "../common/RemoteImage";

function ShowcaseCard({ photo, index }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="relative">
        <RemoteImage
          src={photo.imageUrl}
          alt={photo.caption || `Showcase ${index + 1}`}
          fallbackLabel={String(index + 1)}
          className="h-56 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          fallbackClassName="h-56 w-full"
          textClassName="text-2xl text-slate-600"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          {photo.caption ? (
            <p className="text-sm text-slate-100">{photo.caption}</p>
          ) : (
            <p className="text-xs uppercase tracking-wide text-slate-300">
              Showcase {index + 1}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePhotoShowcase({ photos = [] }) {
  const validPhotos = photos.filter((photo) => photo?.imageUrl);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Photo Showcase</h2>
        <p className="text-sm text-slate-400">
          A little visual window into this profile.
        </p>
      </div>

      {validPhotos.length === 0 ? (
        <p className="text-sm text-slate-400">No showcase images yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {validPhotos.map((photo, index) => (
            <ShowcaseCard key={`${photo.imageUrl}-${index}`} photo={photo} index={index} />
          ))}
        </div>
      )}
    </section>
  );
} 