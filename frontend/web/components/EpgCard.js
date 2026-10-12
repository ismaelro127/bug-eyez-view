import React from "react";

export default function EpgCard({ show }) {
  const { title, program, duration_minutes, section, image, description, url } = show;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all bg-zinc-900 hover:bg-zinc-800"
    >
      {/* Thumbnail */}
      <div className="relative w-full h-48 bg-zinc-800">
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No Image
          </div>
        )}

        {/* Overlay duration badge */}
        {duration_minutes && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-xs text-white px-2 py-1 rounded-md">
            ⏱ {duration_minutes}m
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 text-white">
        <div className="text-sm text-emerald-400 font-semibold">{program}</div>
        <div className="text-base font-bold leading-tight line-clamp-2">{title}</div>
        {section && (
          <span className="inline-block text-xs text-blue-300 mt-1 bg-blue-900/40 px-2 py-0.5 rounded">
            {section}
          </span>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/80 text-white opacity-0 group-hover:opacity-100 p-3 flex items-center justify-center text-sm text-center transition-opacity duration-300">
        <p className="line-clamp-6">{description || "No description available."}</p>
      </div>
    </a>
  );
}
