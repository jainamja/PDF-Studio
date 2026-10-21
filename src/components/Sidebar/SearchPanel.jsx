import React, { useState } from 'react';
import { useDocument } from '../../state/DocumentContext';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

export default function SearchPanel() {
  const {
    activeDoc,
    searchQuery,
    setSearchQuery,
    searchMatchCase,
    setSearchMatchCase,
    searchResults,
    setSearchResults,
    searchCurrentIndex,
    setSearchCurrentIndex,
    setPage,
    addToast
  } = useDocument();

  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!activeDoc || !activeDoc.pdfDoc || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = [];
    const query = searchMatchCase ? searchQuery : searchQuery.toLowerCase();

    try {
      for (let pIdx = 0; pIdx < activeDoc.pageCount; pIdx++) {
        const page = await activeDoc.pdfDoc.getPage(pIdx + 1);
        const textContent = await page.getTextContent();
        const fullPageText = textContent.items.map(item => item.str).join(' ');
        const comparisonText = searchMatchCase ? fullPageText : fullPageText.toLowerCase();

        let pos = 0;
        while ((pos = comparisonText.indexOf(query, pos)) !== -1) {
          const snippetStart = Math.max(0, pos - 30);
          const snippetEnd = Math.min(fullPageText.length, pos + query.length + 30);
          const snippet = (snippetStart > 0 ? '...' : '') +
            fullPageText.slice(snippetStart, snippetEnd) +
            (snippetEnd < fullPageText.length ? '...' : '');

          results.push({
            pageIndex: pIdx,
            snippet,
            matchIndex: pos
          });

          pos += query.length;
        }
      }

      setSearchResults(results);
      setSearchCurrentIndex(0);
      if (results.length > 0) {
        setPage(results[0].pageIndex + 1);
      } else {
        addToast('No matches found for "' + searchQuery + '"', 'info');
      }
    } catch (err) {
      addToast('Search failed: ' + err.message, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleNext = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (searchCurrentIndex + 1) % searchResults.length;
    setSearchCurrentIndex(nextIdx);
    setPage(searchResults[nextIdx].pageIndex + 1);
  };

  const handlePrev = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (searchCurrentIndex - 1 + searchResults.length) % searchResults.length;
    setSearchCurrentIndex(prevIdx);
    setPage(searchResults[prevIdx].pageIndex + 1);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, fontSize: 12 }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '4px 8px' }} disabled={isSearching}>
            <Search size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={searchMatchCase}
              onChange={(e) => setSearchMatchCase(e.target.checked)}
            />
            Match case
          </label>

          {searchResults.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{searchCurrentIndex + 1} of {searchResults.length}</span>
              <button
                type="button"
                onClick={handlePrev}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
        {searchResults.map((res, idx) => (
          <div
            key={idx}
            onClick={() => {
              setSearchCurrentIndex(idx);
              setPage(res.pageIndex + 1);
            }}
            style={{
              padding: '8px 10px',
              backgroundColor: searchCurrentIndex === idx ? 'rgba(99, 102, 241, 0.2)' : '#131b2e',
              border: `1px solid ${searchCurrentIndex === idx ? '#6366f1' : '#1e293b'}`,
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 11,
              lineHeight: 1.4
            }}
          >
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 2 }}>
              Page {res.pageIndex + 1}
            </div>
            <div style={{ color: '#cbd5e1' }}>
              {res.snippet}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
