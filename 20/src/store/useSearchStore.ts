import { create } from 'zustand';
import FlexSearch from 'flexsearch';
import type { SearchResult, SearchMatch, Note } from '../types';
import { getContextAroundMatch } from '../utils/helpers';

interface IndexedNote {
  id: string;
  title: string;
  content: string;
  path: string;
  tags: string;
}

interface SearchStore {
  index: FlexSearch.Document<IndexedNote> | null;
  indexedNotes: Map<string, { title: string; content: string; path: string; tags: string[] }>;
  isIndexing: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  initIndex: () => void;
  addNoteToIndex: (note: Note) => void;
  removeNoteFromIndex: (noteId: string) => void;
  updateNoteInIndex: (note: Note) => void;
  search: (query: string) => Promise<SearchResult[]>;
  clearSearch: () => void;
  buildIndex: (notes: Note[]) => Promise<void>;
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  index: null,
  indexedNotes: new Map(),
  isIndexing: false,
  searchQuery: '',
  searchResults: [],
  isSearching: false,

  initIndex: () => {
    if (get().index) return;

    const index = new FlexSearch.Document<IndexedNote>({
      document: {
        id: 'id',
        index: [
          { field: 'title', tokenize: 'forward', optimize: true },
          { field: 'content', tokenize: 'strict' },
          { field: 'tags', tokenize: 'forward' },
        ],
        store: false,
      },
      charset: 'latin:advanced',
      tokenize: 'forward',
      cache: true,
    });

    set({ index });
  },

  addNoteToIndex: (note: Note) => {
    const { index, indexedNotes } = get();
    if (!index) return;

    index.addAsync(note.id, {
      id: note.id,
      title: note.title,
      content: note.content,
      path: note.path,
      tags: note.tags.join(' '),
    });

    indexedNotes.set(note.id, {
      title: note.title,
      content: note.content,
      path: note.path,
      tags: note.tags,
    });

    set({ indexedNotes: new Map(indexedNotes) });
  },

  removeNoteFromIndex: (noteId: string) => {
    const { index, indexedNotes } = get();
    if (!index) return;

    index.remove(noteId);
    indexedNotes.delete(noteId);
    set({ indexedNotes: new Map(indexedNotes) });
  },

  updateNoteInIndex: (note: Note) => {
    get().removeNoteFromIndex(note.id);
    get().addNoteToIndex(note);
  },

  search: async (query: string): Promise<SearchResult[]> => {
    const { index, indexedNotes } = get();
    if (!index || !query.trim()) {
      set({ searchResults: [], searchQuery: query, isSearching: false });
      return [];
    }

    set({ isSearching: true, searchQuery: query });

    try {
      const results = await index.searchAsync(query, {
        limit: 50,
        suggest: true,
      });

      const matchedIds = new Set<string>();
      const fieldMatches = new Map<string, Map<string, number[]>>();

      results.forEach((result) => {
        result.result.forEach((id: string | number) => {
          const noteId = String(id);
          matchedIds.add(noteId);
          if (!fieldMatches.has(noteId)) {
            fieldMatches.set(noteId, new Map());
          }
          const noteMatches = fieldMatches.get(noteId)!;
          if (!noteMatches.has(result.field)) {
            noteMatches.set(result.field, []);
          }
        });
      });

      const searchResults: SearchResult[] = [];

      matchedIds.forEach((noteId) => {
        const noteData = indexedNotes.get(noteId);
        if (!noteData) return;

        const matches: SearchMatch[] = [];

        const titleLower = noteData.title.toLowerCase();
        const queryLower = query.toLowerCase();
        let titlePos = titleLower.indexOf(queryLower);
        while (titlePos !== -1) {
          matches.push({
            field: 'title',
            start: titlePos,
            end: titlePos + query.length,
            text: noteData.title.slice(titlePos, titlePos + query.length),
            context: noteData.title,
          });
          titlePos = titleLower.indexOf(queryLower, titlePos + 1);
        }

        const contentLower = noteData.content.toLowerCase();
        let contentPos = contentLower.indexOf(queryLower);
        let matchCount = 0;
        while (contentPos !== -1 && matchCount < 5) {
          const context = getContextAroundMatch(noteData.content, contentPos, 60);
          matches.push({
            field: 'content',
            start: contentPos,
            end: contentPos + query.length,
            text: noteData.content.slice(contentPos, contentPos + query.length),
            context: context.before + context.after,
          });
          contentPos = contentLower.indexOf(queryLower, contentPos + 1);
          matchCount++;
        }

        if (matches.length > 0) {
          searchResults.push({
            id: noteId,
            title: noteData.title,
            path: noteData.path,
            tags: noteData.tags,
            matches,
          });
        }
      });

      searchResults.sort((a, b) => {
        const aTitleMatches = a.matches.filter((m) => m.field === 'title').length;
        const bTitleMatches = b.matches.filter((m) => m.field === 'title').length;
        if (aTitleMatches !== bTitleMatches) {
          return bTitleMatches - aTitleMatches;
        }
        return b.matches.length - a.matches.length;
      });

      set({ searchResults, isSearching: false });
      return searchResults;
    } catch (error) {
      console.error('Search error:', error);
      set({ searchResults: [], isSearching: false });
      return [];
    }
  },

  clearSearch: () => {
    set({ searchQuery: '', searchResults: [], isSearching: false });
  },

  buildIndex: async (notes: Note[]): Promise<void> => {
    const { index } = get();
    if (!index) {
      get().initIndex();
    }

    set({ isIndexing: true });
    const currentIndex = get().index;
    const indexedNotes = new Map<string, { title: string; content: string; path: string; tags: string[] }>();

    if (currentIndex) {
      notes.forEach((note) => {
        if (note.encrypted) return;

        try {
          currentIndex.addAsync(note.id, {
            id: note.id,
            title: note.title,
            content: note.content,
            path: note.path,
            tags: note.tags.join(' '),
          });

          indexedNotes.set(note.id, {
            title: note.title,
            content: note.content,
            path: note.path,
            tags: note.tags,
          });
        } catch (error) {
          console.error('Failed to index note:', note.title, error);
        }
      });
    }

    set({ indexedNotes, isIndexing: false });
  },
}));
