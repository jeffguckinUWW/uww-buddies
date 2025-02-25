// src/components/Messaging/shared/SearchBar.jsx

import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { Button } from '../../../components/ui/button';

const SearchBar = ({ params, onSearchComplete }) => {
  const [searchText, setSearchText] = useState('');
  const { searchMessages, clearSearch, searchLoading } = useMessages();

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    
    await searchMessages({
      ...params,
      searchText: searchText.trim()
    });

    if (onSearchComplete) {
      onSearchComplete();
    }
  }, [searchText, params, searchMessages, onSearchComplete]);

  const handleClear = () => {
    setSearchText('');
    clearSearch();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-white rounded-md border">
        <Search className="text-gray-400" size={16} />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search messages..."
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400"
        />
        {searchText && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <Button 
        size="sm"
        onClick={handleSearch}
        disabled={!searchText.trim() || searchLoading}
      >
        {searchLoading ? 'Searching...' : 'Search'}
      </Button>
    </div>
  );
};

export default SearchBar;