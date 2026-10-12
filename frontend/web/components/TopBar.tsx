import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: string;
}

export interface TopBarProps {
  user: any;

  // 🔹 Coin system optional for now
  
  contentTabs: Tab[];
  onContentTabChange: (tabId: string) => void;

  availableRegions: string[];
  selectedRegion: string;
  onRegionSelect: (region: string) => void;

  availableLanguages: string[];
  selectedLanguage: string;
  onLanguageSelect: (lang: string) => void;

  availableGenres: string[];
  selectedGenre: string;
  onGenreSelect: (genre: string) => void;

  // 🔹 Dashboard extras
  activeTab?: string;
  notifications?: any[];
  onLogout?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  user,
  contentTabs,
  onContentTabChange,
  availableRegions,
  selectedRegion,
  onRegionSelect,
  availableLanguages,
  selectedLanguage,
  onLanguageSelect,
  availableGenres,
  selectedGenre,
  onGenreSelect,
  activeTab,
  notifications,
  onLogout,
}) => {
  return (
    <div className="bg-gray-800 text-white px-4 py-2 space-y-2">
  
      {/* Content Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-1">
        {contentTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onContentTabChange(tab.id)}
            className={`px-3 py-1 rounded ${
              activeTab === tab.id
                ? 'bg-yellow-600'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {tab.icon && <span className="mr-1">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dropdown Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Region */}
        <div>
          <label className="text-sm block mb-1">🌍 Region</label>
          <select
            className="bg-gray-700 text-white rounded px-2 py-1"
            value={selectedRegion}
            onChange={(e) => onRegionSelect(e.target.value)}
          >
            <option value="All">All Regions</option>
            {availableRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="text-sm block mb-1">🌐 Language</label>
          <select
            className="bg-gray-700 text-white rounded px-2 py-1"
            value={selectedLanguage}
            onChange={(e) => onLanguageSelect(e.target.value)}
          >
            <option value="All">All Languages</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* Genre */}
        <div>
          <label className="text-sm block mb-1">🎭 Genre</label>
          <select
            className="bg-gray-700 text-white rounded px-2 py-1"
            value={selectedGenre}
            onChange={(e) => onGenreSelect(e.target.value)}
          >
            <option value="All">All Genres</option>
            {availableGenres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logout + Notifications (if available) */}
      <div className="flex justify-between mt-2">
        {notifications && notifications.length > 0 && (
          <div className="text-sm text-gray-300">
            🔔 {notifications.length} new notifications
          </div>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="ml-auto bg-red-700 px-3 py-1 rounded"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
};

export default TopBar;
