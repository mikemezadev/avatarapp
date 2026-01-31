
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useCollection } from './CollectionContext';
import { CardModal } from './CardModal';
import { Card, Deck, DeckCardEntry } from '../types';
import { APPA_LAND_MAP, MANA_SYMBOLS } from '../constants';

export const DecksView: React.FC = () => {
  const { decks, cards, collection, toggleDeckCollected, focusedDeck, setFocusedDeck } = useCollection();
  
  // Explicitly track the active deck object instead of just the card
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // Random Picker States
  const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
  const [spinState, setSpinState] = useState<'selection' | 'ready' | 'spinning' | 'won'>('selection');
  const [spinSequence, setSpinSequence] = useState<any[]>([]);
  const [spinWinner, setSpinWinner] = useState<Deck | null>(null);
  const [currentSourceType, setCurrentSourceType] = useState<'all' | 'beginner' | 'jumpstart'>('all'); // Track for Spin Again
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Filter States
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  
  // Section Collapse States
  const [showBeginner, setShowBeginner] = useState(true);
  const [showJumpstart, setShowJumpstart] = useState(true);

  // Helpers
  const getCardData = (entry: DeckCardEntry): Card | undefined => {
      if (entry.set && entry.collectorNumber) {
          const preciseMatch = cards.find(c => 
              c.set.toLowerCase() === entry.set!.toLowerCase() && 
              c.collector_number === entry.collectorNumber
          );
          if (preciseMatch) return preciseMatch;
      }
      if (APPA_LAND_MAP[entry.name]) {
          return cards.find(c => c.set === 'tla' && c.collector_number === APPA_LAND_MAP[entry.name]);
      }
      const exactMatch = cards.find(c => c.name === entry.name);
      if (exactMatch) return exactMatch;
      const prefixMatch = cards.find(c => c.name.startsWith(entry.name + " //"));
      if (prefixMatch) return prefixMatch;
      return undefined;
  }

  const findThemeCard = (deck: Deck): Card | undefined => {
        // Clean deck name to find card name match. 
        // Handles "Aang (0001)" -> "Aang" and "Adept (0011) - Variation 1" -> "Adept"
        const deckNameClean = deck.title.split(' (')[0].trim();
        const numberMatch = deck.title.match(/\((\d+)\)/);
        const deckNumber = numberMatch ? numberMatch[1] : null;

        let themeCardData: Card | undefined;

        // 1. Strict Set Lookup based on Source
        if (deck.source === 'Beginner Box') {
            // Priority: Match Name in FTLA
            themeCardData = cards.find(c => c.set === 'ftla' && c.name.toLowerCase() === deckNameClean.toLowerCase());
            
            // Fallback: Match Collector Number in FTLA (if name differs, e.g. "Fire Nation" deck vs "Zuko" card)
            if (!themeCardData && deckNumber) {
                 // Try padding the number if necessary or direct match
                 themeCardData = cards.find(c => c.set === 'ftla' && c.collector_number === deckNumber);
            }
        } else {
            // Jumpstart: Look in JTLA using the clean name
             themeCardData = cards.find(c => c.set === 'jtla' && c.name.toLowerCase() === deckNameClean.toLowerCase());
        }

        // 2. Fallback: Existing generic themeCard logic if specific set lookup failed
        if (!themeCardData) {
            if (deck.themeCard) {
                themeCardData = getCardData({ name: deck.themeCard, qty: 1 });
            } else {
                const potentialThemeEntry = deck.cards.find(c => c.name.startsWith(deckNameClean));
                themeCardData = potentialThemeEntry ? getCardData(potentialThemeEntry) : undefined;
            }
        }

        // 3. Last Resort: Find ANY valid card in the deck to act as the face
        if (!themeCardData && deck.cards.length > 0) {
             for (const entry of deck.cards) {
                 const found = getCardData(entry);
                 if (found) {
                     themeCardData = found;
                     break;
                 }
             }
        }

        return themeCardData;
  };

  // Effect to handle navigation from other views (MOVED BELOW Helpers due to dependencies)
  useEffect(() => {
    if (focusedDeck) {
        // Find the deck object
        const deck = decks.find(d => d.title === focusedDeck);
        if (deck) {
            setActiveDeck(deck);
            // Locate the face card to open the modal
            const faceCard = findThemeCard(deck);
            if (faceCard) {
                setSelectedCard(faceCard);
            }
        }
        setFocusedDeck(null);
    }
  }, [focusedDeck, decks, setFocusedDeck, cards]); // Added missing dependencies if any, though functions are closures here.


  const getCardImage = (card?: Card, type: 'normal' | 'art_crop' = 'art_crop') => {
      if (!card) return undefined;
      if (card.image_uris && card.image_uris[type]) return card.image_uris[type];
      if (card.card_faces && card.card_faces[0]?.image_uris && card.card_faces[0].image_uris[type]) return card.card_faces[0].image_uris[type];
      return 'https://via.placeholder.com/250x350?text=No+Image';
  };

  const getDeckColors = (deck: Deck): string[] => {
      const colors = new Set<string>();
      deck.cards.forEach(entry => {
          const card = getCardData(entry);
          if (card) {
              // Check lands for direct color association
              if (card.name.includes('Plains')) colors.add('W');
              if (card.name.includes('Island')) colors.add('U');
              if (card.name.includes('Swamp')) colors.add('B');
              if (card.name.includes('Mountain')) colors.add('R');
              if (card.name.includes('Forest')) colors.add('G');
          }
      });
      return Array.from(colors);
  };

  const toggleColor = (color: string) => {
      setColorFilter(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  };

  // Processing Decks
  const { processedDecks, beginnerDecks, jumpstartDecks } = useMemo(() => {
      const processed = decks.map(deck => {
          const themeCardData = findThemeCard(deck);
          
          // Clean title for display: remove (number) but keep variations.
          let displayTitle = deck.title.replace(/\s*\(\d+\)/, '').trim();

          if (deck.source === 'Beginner Box' && themeCardData) {
              // For beginner box, prefer the actual theme card name if available
              displayTitle = themeCardData.name;
          }

          return {
              ...deck,
              displayTitle,
              colors: getDeckColors(deck),
              themeCardData,
              // Extract number from "Title (001)" format for sorting Jumpstart
              number: parseInt(deck.title.match(/\((\d+)\)/)?.[1] || '9999', 10),
              // Helper for Beginner sorting - use theme card collector number
              themeCollectorNumber: themeCardData ? parseInt(themeCardData.collector_number.replace(/\D/g, ''), 10) : 9999
          };
      });

      const filtered = processed.filter(deck => {
            const matchesSearch = deck.displayTitle.toLowerCase().includes(searchFilter.toLowerCase());
            const matchesColor = colorFilter.length === 0 || colorFilter.every(c => deck.colors.includes(c));
            return matchesSearch && matchesColor;
      });

      return {
          processedDecks: processed, // Expose processed list for random picker to use all data
          // Sort Beginner decks by their Theme Card's collector number (ftla order)
          beginnerDecks: filtered.filter(d => d.source === 'Beginner Box').sort((a, b) => a.themeCollectorNumber - b.themeCollectorNumber),
          // Sort Jumpstart decks by their explicit deck number (e.g. (001))
          jumpstartDecks: filtered.filter(d => d.source !== 'Beginner Box').sort((a, b) => a.number - b.number)
      };
  }, [decks, searchFilter, colorFilter, cards]);

  const totalCollected = decks.filter(deck => collection.decks[deck.title]).length;

  const handleDeckClick = (deck: any) => {
      setActiveDeck(deck);
      if (deck.themeCardData) {
          setSelectedCard(deck.themeCardData);
      } else {
          // Fallback if deck object doesn't have themeCardData pre-calculated (e.g. from random picker)
          const themeCard = findThemeCard(deck);
          if (themeCard) setSelectedCard(themeCard);
      }
  };

  const handleNextDeck = () => {
    if (!activeDeck) return;
    
    let currentList: any[] = [];
    if (activeDeck.source === 'Beginner Box') {
        currentList = beginnerDecks;
    } else {
        currentList = jumpstartDecks;
    }

    const currentIndex = currentList.findIndex(d => d.title === activeDeck.title);
    if (currentIndex !== -1 && currentIndex < currentList.length - 1) {
        const nextDeck = currentList[currentIndex + 1];
        handleDeckClick(nextDeck);
    }
  };

  const handlePrevDeck = () => {
    if (!activeDeck) return;

    let currentList: any[] = [];
    if (activeDeck.source === 'Beginner Box') {
        currentList = beginnerDecks;
    } else {
        currentList = jumpstartDecks;
    }

    const currentIndex = currentList.findIndex(d => d.title === activeDeck.title);
    if (currentIndex > 0) {
        const prevDeck = currentList[currentIndex - 1];
        handleDeckClick(prevDeck);
    }
  };

  const WINNER_INDEX = 50; // The index where the spinner will stop
  const EXTRA_CARDS = 5;   // Number of cards displayed AFTER the winner

  const setupRandomPicker = (sourceType: 'all' | 'beginner' | 'jumpstart') => {
      setCurrentSourceType(sourceType);

      // 1. Get Candidates based on collection and type
      const collectedDecks = processedDecks.filter(d => collection.decks[d.title]);
      let candidates = [];
      
      if (sourceType === 'all') {
          candidates = collectedDecks;
      } else if (sourceType === 'beginner') {
          candidates = collectedDecks.filter(d => d.source === 'Beginner Box');
      } else {
          candidates = collectedDecks.filter(d => d.source !== 'Beginner Box');
      }
      
      if (candidates.length === 0) {
          alert("No collected decks found for this category!");
          return;
      }

      // 2. Select Winner
      const winnerIndex = Math.floor(Math.random() * candidates.length);
      const winner = candidates[winnerIndex];

      // 3. Create Sequence
      // Shuffle candidates to create randomness in the strip
      const shuffled = [...candidates].sort(() => 0.5 - Math.random());
      
      // We want enough cards to reach WINNER_INDEX + EXTRA_CARDS
      const TOTAL_LENGTH = WINNER_INDEX + EXTRA_CARDS + 1;
      let sequence: any[] = [];
      
      // Fill the sequence by repeating the shuffled candidates until we have enough
      while (sequence.length < TOTAL_LENGTH) {
          sequence = [...sequence, ...shuffled];
      }
      
      // Trim to target length
      sequence = sequence.slice(0, TOTAL_LENGTH);
      
      // FORCE the winner at the specific index
      sequence[WINNER_INDEX] = winner;
      
      setSpinSequence(sequence);
      setSpinWinner(winner);
      setSpinState('ready');
  };

  const playTickSound = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Ensure context is running (it can suspend without user gesture)
      if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, audioCtxRef.current.currentTime + 0.05);

      gain.gain.setValueAtTime(0.05, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.05);

      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.05);
  };

  const handleSpin = () => {
      setSpinState('spinning');
      
      // Play ticking sounds
      const duration = 4000; // 4 seconds spin
      const ticks = 20;
      for (let i = 0; i < ticks; i++) {
          // Slow down ticks exponentially
          const time = (i / ticks) * duration;
          // Apply an ease-out curve to timing
          setTimeout(playTickSound, time);
      }

      // Finish spin
      setTimeout(() => {
          setSpinState('won');
          // Play a "ding"
          if (audioCtxRef.current) {
               const osc = audioCtxRef.current.createOscillator();
               const gain = audioCtxRef.current.createGain();
               osc.connect(gain);
               gain.connect(audioCtxRef.current.destination);
               osc.type = 'sine';
               osc.frequency.setValueAtTime(500, audioCtxRef.current.currentTime);
               osc.frequency.exponentialRampToValueAtTime(1000, audioCtxRef.current.currentTime + 0.5);
               gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
               gain.gain.exponentialRampToValueAtTime(0, audioCtxRef.current.currentTime + 1);
               osc.start();
               osc.stop(audioCtxRef.current.currentTime + 1);
          }
          
          // No longer automatically open deck info - user must click view
      }, duration);
  };


  const renderDeckGrid = (deckList: any[]) => (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {deckList.map((deck) => {
              const isCollected = collection.decks[deck.title];
              const artUrl = getCardImage(deck.themeCardData, 'art_crop');
              
              return (
                  <div 
                      key={deck.title}
                      className={`group relative bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col overflow-hidden ${isCollected ? 'ring-2 ring-green-500 border-green-500' : 'border-gray-200'}`}
                      onClick={() => handleDeckClick(deck)}
                  >
                      {/* Image Area */}
                      <div className="relative aspect-[4/3] bg-gray-200 overflow-hidden">
                          {artUrl ? (
                              <img 
                                  src={artUrl} 
                                  alt={deck.displayTitle} 
                                  className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-110" 
                              />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <i className="fa-solid fa-image text-3xl"></i>
                              </div>
                          )}
                          
                          {/* Collected Toggle Overlay */}
                          <button 
                              onClick={(e) => { e.stopPropagation(); toggleDeckCollected(deck.title); }}
                              className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all ${
                                  isCollected 
                                  ? 'bg-green-500 text-white hover:bg-green-600' 
                                  : 'bg-black/50 text-white/50 hover:bg-black/70 hover:text-white'
                              }`}
                              title={isCollected ? "Mark as uncollected" : "Mark as collected"}
                          >
                              <i className="fa-solid fa-check text-sm"></i>
                          </button>
                      </div>

                      {/* Content Area */}
                      <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                          <div>
                              <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                      {deck.displayTitle}
                                  </h3>
                              </div>
                              <div className="text-xs text-gray-500 mb-2">
                                  {deck.source === 'Beginner Box' ? 'Beginner Box' : 'Jumpstart'}
                              </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                <div className="flex -space-x-1">
                                    {deck.colors.map((c: string) => (
                                        <img key={c} src={MANA_SYMBOLS[c]} alt={c} className="w-4 h-4 rounded-full shadow-sm bg-white" />
                                    ))}
                                    {deck.colors.length === 0 && <span className="text-xs text-gray-400">Colorless</span>}
                                </div>
                                <span className="text-[10px] font-mono text-gray-400">
                                    {deck.source !== 'Beginner Box' && deck.number < 9000 ? `#${deck.number}` : ''}
                                    {deck.source === 'Beginner Box' && deck.themeCardData ? `#${deck.themeCardData.collector_number}` : ''}
                                </span>
                          </div>
                      </div>
                  </div>
              );
          })}
      </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-20 z-30">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-secondary"></i> 
                    <span>Jumpstart Decks</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Collected: <span className="font-bold text-primary">{totalCollected}</span> / {decks.length}
                </p>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                <button 
                    onClick={() => { setIsRandomPickerOpen(true); setSpinState('selection'); }}
                    className="h-10 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 shadow-sm transition-colors flex items-center justify-center gap-2"
                    title="Pick Random Deck from Collection"
                >
                    <i className="fa-solid fa-dice"></i>
                    <span className="hidden md:inline font-bold text-sm">Pick Random</span>
                </button>
                
                <div className="relative flex-1 md:w-64">
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-sm"></i>
                    <input 
                        type="text" 
                        placeholder="Search decks..." 
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder-gray-400"
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                    />
                </div>

                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    {['W', 'U', 'B', 'R', 'G'].map(c => (
                        <button 
                            key={c}
                            onClick={() => toggleColor(c)}
                            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                                colorFilter.includes(c) ? 'bg-white shadow-sm scale-110' : 'opacity-60 hover:opacity-100'
                            }`}
                        >
                            <img src={MANA_SYMBOLS[c]} alt={c} className="w-4 h-4" />
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Beginner Box Section */}
        {beginnerDecks.length > 0 && (
            <div className="space-y-4">
                <button 
                    onClick={() => setShowBeginner(!showBeginner)}
                    className="w-full flex items-center justify-between bg-orange-50 hover:bg-orange-100 border border-orange-200 p-4 rounded-xl transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center font-bold text-sm">
                            {beginnerDecks.length}
                        </span>
                        <h3 className="text-lg font-bold text-orange-900">Beginner Box Decks</h3>
                    </div>
                    <i className={`fa-solid fa-chevron-down text-orange-400 transition-transform duration-300 ${showBeginner ? 'rotate-180' : ''}`}></i>
                </button>
                
                {showBeginner && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        {renderDeckGrid(beginnerDecks)}
                    </div>
                )}
            </div>
        )}

        {/* Jumpstart Section */}
        {jumpstartDecks.length > 0 && (
            <div className="space-y-4">
                <button 
                    onClick={() => setShowJumpstart(!showJumpstart)}
                    className="w-full flex items-center justify-between bg-blue-50 hover:bg-blue-100 border border-blue-200 p-4 rounded-xl transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {jumpstartDecks.length}
                        </span>
                        <h3 className="text-lg font-bold text-blue-900">Jumpstart Booster Decks</h3>
                    </div>
                    <i className={`fa-solid fa-chevron-down text-blue-400 transition-transform duration-300 ${showJumpstart ? 'rotate-180' : ''}`}></i>
                </button>

                {showJumpstart && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        {renderDeckGrid(jumpstartDecks)}
                    </div>
                )}
            </div>
        )}

        {/* No Results */}
        {beginnerDecks.length === 0 && jumpstartDecks.length === 0 && (
             <div className="text-center py-20 text-gray-400">
                <i className="fa-solid fa-ghost text-4xl mb-4"></i>
                <p>No decks found matching your filters.</p>
            </div>
        )}
        
        {selectedCard && (
            <CardModal 
                card={selectedCard} 
                onClose={() => { setSelectedCard(null); setActiveDeck(null); }} 
                variant="deck" 
                deck={activeDeck || undefined} // Pass the specific deck we clicked
                onNext={handleNextDeck}
                onPrev={handlePrevDeck}
            />
        )}

        {/* Random Picker Modal */}
        {isRandomPickerOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsRandomPickerOpen(false)}>
                <div 
                    className={`bg-white rounded-2xl shadow-xl w-full ${spinState === 'selection' ? 'max-w-md' : 'max-w-4xl'} overflow-hidden transition-all duration-300`} 
                    onClick={e => e.stopPropagation()}
                >
                    {spinState === 'selection' ? (
                        <>
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <i className="fa-solid fa-dice text-primary"></i> Pick Random Deck
                                </h3>
                            </div>
                            <div className="p-6 space-y-3">
                                <p className="text-gray-600 text-sm mb-4">Choose which pool of <strong>collected</strong> decks to pick from:</p>
                                
                                <button onClick={() => setupRandomPicker('beginner')} className="w-full py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl border border-orange-200 transition-colors flex items-center justify-between group">
                                    <span>Beginner Box Decks</span>
                                    <i className="fa-solid fa-chevron-right opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </button>
                                
                                <button onClick={() => setupRandomPicker('jumpstart')} className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-between group">
                                    <span>Jumpstart Booster Decks</span>
                                    <i className="fa-solid fa-chevron-right opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </button>
                                
                                <button onClick={() => setupRandomPicker('all')} className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-200 transition-colors flex items-center justify-between group">
                                    <span>All Collected Decks</span>
                                    <i className="fa-solid fa-chevron-right opacity-0 group-hover:opacity-100 transition-opacity"></i>
                                </button>
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                                <button onClick={() => setIsRandomPickerOpen(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-gray-100 min-h-[500px]">
                            {/* Spinner Container */}
                            <div className="relative w-full max-w-3xl h-96 overflow-hidden rounded-xl border-4 border-primary bg-white shadow-inner mb-8">
                                {/* Center Indicator */}
                                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-yellow-400 z-20 opacity-50"></div>
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 text-primary text-3xl filter drop-shadow-md">
                                    <i className="fa-solid fa-caret-down"></i>
                                </div>
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-30 text-primary text-3xl filter drop-shadow-md">
                                    <i className="fa-solid fa-caret-up"></i>
                                </div>

                                {/* Moving Track */}
                                <div 
                                    className="flex items-center h-full absolute left-1/2 gap-4"
                                    style={{
                                        // Card width 16rem + gap 1rem = 17rem per item.
                                        // Center of item is 8rem from left.
                                        // To center the 0th item: translateX(-8rem)
                                        // To center the Winner (index WINNER_INDEX): translateX( -8rem - (WINNER_INDEX * 17rem) )
                                        transform: spinState === 'ready' 
                                            ? 'translateX(-8rem)' 
                                            : `translateX(calc(-8rem - ${(WINNER_INDEX) * 17}rem))`,
                                        transition: spinState === 'spinning' 
                                            ? 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)' 
                                            : 'none'
                                    }}
                                >
                                    {spinSequence.map((deck, idx) => {
                                        // Use 'normal' type to get the full card art as requested
                                        const artUrl = getCardImage(deck.themeCardData, 'normal') || 'https://via.placeholder.com/250x350?text=No+Image';
                                        
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`w-64 h-88 flex-shrink-0 bg-white rounded-lg overflow-hidden shadow-md relative border border-gray-300 transition-all duration-300 ${spinState === 'won' && idx === WINNER_INDEX ? 'ring-4 ring-yellow-400 scale-105 z-10' : ''}`}
                                            >
                                                <img src={artUrl} alt={deck.title} className="w-full h-full object-cover" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Controls */}
                            <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
                                {spinState === 'ready' && (
                                    <button 
                                        onClick={handleSpin}
                                        className="px-12 py-4 bg-gradient-to-r from-primary to-purple-600 text-white font-black text-2xl rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all transform active:scale-95 animate-pulse"
                                    >
                                        SPIN!
                                    </button>
                                )}
                                {spinState === 'spinning' && (
                                    <div className="text-gray-500 font-bold text-xl animate-bounce">
                                        Spinning...
                                    </div>
                                )}
                                {spinState === 'won' && spinWinner && (
                                    <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-500 w-full">
                                        <div className="text-center bg-white p-6 rounded-xl border border-green-200 shadow-md w-full">
                                            <h4 className="text-green-700 font-bold text-2xl mb-2 flex items-center justify-center gap-2">
                                                <div className="flex -space-x-1 mr-2">
                                                    {spinWinner.colors.length > 0 ? (
                                                        spinWinner.colors.map((c: string) => (
                                                            <img key={c} src={MANA_SYMBOLS[c]} alt={c} className="w-6 h-6 rounded-full shadow-sm bg-white" />
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-gray-400">C</span>
                                                    )}
                                                </div>
                                                {spinWinner.displayTitle}
                                            </h4>
                                            <p className="text-gray-600 italic">"{spinWinner.summary || 'No summary available.'}"</p>
                                        </div>
                                        
                                        <div className="flex gap-4 mt-2">
                                            <button 
                                                onClick={() => setSpinState('selection')}
                                                className="px-6 py-2 bg-gray-100 text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                            >
                                                Back to Selection
                                            </button>
                                            
                                            <button 
                                                onClick={() => setupRandomPicker(currentSourceType)}
                                                className="px-6 py-2 bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200 border border-purple-200 transition-colors flex items-center gap-2"
                                            >
                                                <i className="fa-solid fa-rotate-right"></i> Spin Again
                                            </button>

                                            <button 
                                                onClick={() => { setIsRandomPickerOpen(false); handleDeckClick(spinWinner); }}
                                                className="px-8 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 shadow-md transition-colors flex items-center gap-2"
                                            >
                                                View Deck <i className="fa-solid fa-arrow-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Close Button (if stuck) */}
                            <button 
                                onClick={() => setIsRandomPickerOpen(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <i className="fa-solid fa-xmark text-xl"></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
