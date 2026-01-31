
import React, { useState, useMemo, useEffect } from 'react';
import { COMPREHENSIVE_RULES } from '../rules';

interface RuleSubsection {
  id: string;
  title: string;
  content: string[];
}

interface RuleSection {
  id: string;
  title: string;
  subsections: RuleSubsection[];
}

// Helper to determine if a line in Glossary is a Term
// Moved outside component to ensure stability and avoid unnecessary recreations
const isGlossaryTerm = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Heuristic:
    // 1. Definition usually ends in ., :, or ; or " (quote)
    if (/[.:;"”]$/.test(trimmed)) return false;
    // 2. Numbered lists are definitions
    if (/^\d+\./.test(trimmed)) return false;
    // 3. "See rule..." lines
    if (trimmed.startsWith("See rule") || trimmed.startsWith("See section")) return false;
    
    // Assume it's a term if it passes above checks
    return true;
};

export const RulesView: React.FC = () => {
  const [rulesText] = useState<string>(COMPREHENSIVE_RULES);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const parsedRules = useMemo(() => {
    if (!rulesText) return [];

    const lines = rulesText.split(/\r?\n/);
    // Maintain insertion order
    const sectionList: RuleSection[] = [];
    const sectionMap = new Map<string, RuleSection>();
    
    let currentSectionId: string | null = null;
    let currentSubsectionId: string | null = null;

    // Helper to get or create section
    const getOrCreateSection = (id: string, title: string): RuleSection => {
        if (!sectionMap.has(id)) {
            const newSection = { id, title, subsections: [] };
            sectionMap.set(id, newSection);
            sectionList.push(newSection);
        }
        return sectionMap.get(id)!;
    };

    // Regex matchers
    const subsectionRegex = /^(\d{3})\.\s+(.+)$/;
    const sectionRegex = /^(\d+)\.\s+(.+)$/;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed === "Contents") return; // Skip TOC header
        if (trimmed.startsWith("Magic: The Gathering Comprehensive Rules")) return; // Skip title

        // 1. Introduction
        if (trimmed === "Introduction") {
            const id = "Introduction";
            getOrCreateSection(id, "Introduction");
            currentSectionId = id;
            
            const section = sectionMap.get(id)!;
            if (!section.subsections.find(s => s.id === "intro")) {
                section.subsections.push({ id: "intro", title: "", content: [] });
            }
            currentSubsectionId = "intro";
            return;
        }

        // 2. Glossary
        if (trimmed === "Glossary") {
            const id = "Glossary";
            getOrCreateSection(id, "Glossary");
            currentSectionId = id;
            currentSubsectionId = null; // Reset subsection for glossary start
            return;
        }

        // 3. Credits
        if (trimmed === "Credits") {
            const id = "Credits";
            getOrCreateSection(id, "Credits");
            currentSectionId = id;

            const section = sectionMap.get(id)!;
            if (!section.subsections.find(s => s.id === "credits")) {
                section.subsections.push({ id: "credits", title: "Credits", content: [] });
            }
            currentSubsectionId = "credits";
            return;
        }

        // Special handling for Glossary content
        if (currentSectionId === "Glossary") {
            // Check if we hit Credits (end of glossary)
            if (trimmed === "Credits") {
                // Rerun logic for Credits block (re-using block above effectively)
                const id = "Credits";
                getOrCreateSection(id, "Credits");
                currentSectionId = id;
                const section = sectionMap.get(id)!;
                if (!section.subsections.find(s => s.id === "credits")) {
                    section.subsections.push({ id: "credits", title: "Credits", content: [] });
                }
                currentSubsectionId = "credits";
                return;
            }

            const section = sectionMap.get("Glossary")!;
            
            // Determine if line is a Term or Definition
            if (isGlossaryTerm(trimmed)) {
                const firstChar = trimmed.charAt(0).toUpperCase();
                // Create alphabetical subsections
                if (/[A-Z]/.test(firstChar) || /^\d/.test(firstChar)) {
                    let subTitle = /[A-Z]/.test(firstChar) ? firstChar : "#";
                    let subId = `glossary-${subTitle}`;
                    
                    let sub = section.subsections.find(s => s.id === subId);
                    if (!sub) {
                        sub = { id: subId, title: subTitle, content: [] };
                        section.subsections.push(sub);
                    }
                    currentSubsectionId = subId;
                    sub.content.push(trimmed);
                } else {
                     // Fallback if parsing fails or special char
                     if (!currentSubsectionId && section.subsections.length > 0) {
                         currentSubsectionId = section.subsections[section.subsections.length - 1].id;
                     }
                     if (currentSubsectionId) {
                         section.subsections.find(s => s.id === currentSubsectionId)?.content.push(trimmed);
                     }
                }
            } else {
                // It's a definition line, add to current subsection
                if (currentSubsectionId) {
                    section.subsections.find(s => s.id === currentSubsectionId)?.content.push(trimmed);
                }
            }
            return;
        }

        // 4. Check for Subsection (100. General)
        const subsectionMatch = trimmed.match(subsectionRegex);
        if (subsectionMatch) {
            const id = subsectionMatch[1];
            const title = subsectionMatch[2];
            
            // If we are in a section, ensure this subsection exists there
            let parentId = currentSectionId;
            if (!parentId || (parentId !== "Introduction" && parentId !== "Glossary" && parentId !== "Credits" && !id.startsWith(parentId))) {
                parentId = id.charAt(0); 
            }

            if (parentId) {
                const currentSection = getOrCreateSection(parentId, sectionMap.get(parentId)?.title || `Section ${parentId}`);
                currentSectionId = parentId; 
                
                let sub = currentSection.subsections.find(s => s.id === id);
                if (!sub) {
                    sub = { id, title, content: [] };
                    currentSection.subsections.push(sub);
                }
                currentSubsectionId = id;
            }
            return;
        }

        // 5. Check for Main Section (1. Game Concepts)
        const sectionMatch = trimmed.match(sectionRegex);
        if (sectionMatch) {
            const id = sectionMatch[1];
            const title = sectionMatch[2];
            
            getOrCreateSection(id, title);
            currentSectionId = id;
            currentSubsectionId = null;
            return;
        }

        // 6. Add content to current subsection
        if (currentSectionId) {
            const currentSection = sectionMap.get(currentSectionId);
            if (currentSection) {
                let targetSubId = currentSubsectionId;
                
                if (!targetSubId) {
                     if (currentSection.subsections.length > 0) {
                         targetSubId = currentSection.subsections[currentSection.subsections.length - 1].id;
                     }
                }

                if (targetSubId) {
                    const sub = currentSection.subsections.find(s => s.id === targetSubId);
                    if (sub) {
                        sub.content.push(trimmed);
                    }
                }
            }
        }
    });

    return sectionList;
  }, [rulesText]);

  const filteredRules = useMemo(() => {
    if (!searchTerm) return parsedRules;
    const lowerSearch = searchTerm.toLowerCase();

    return parsedRules.map(section => {
        // If section title matches, include all subsections
        if (section.title.toLowerCase().includes(lowerSearch)) {
            return section;
        }

        // Filter subsections
        const matchingSubsections = section.subsections.filter(sub => {
            const idMatch = sub.id.includes(lowerSearch);
            const titleMatch = sub.title.toLowerCase().includes(lowerSearch);
            const contentMatch = sub.content.some(line => line.toLowerCase().includes(lowerSearch));
            return idMatch || titleMatch || contentMatch;
        });

        if (matchingSubsections.length > 0) {
            return {
                ...section,
                subsections: matchingSubsections
            };
        }
        return null;
    }).filter((s): s is RuleSection => s !== null);
  }, [parsedRules, searchTerm]);

  // Auto-expand sections when searching
  useEffect(() => {
      if (searchTerm && filteredRules.length > 0) {
          setExpandedSection(filteredRules[0].id);
      }
  }, [searchTerm, filteredRules]);

  const scrollToAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const highlightText = (text: string, term: string) => {
      if (!term) return text;
      const parts = text.split(new RegExp(`(${term})`, 'gi'));
      return (
          <span>
              {parts.map((part, i) => 
                part.toLowerCase() === term.toLowerCase() 
                    ? <span key={i} className="bg-yellow-200 text-black font-semibold px-0.5 rounded">{part}</span> 
                    : part
              )}
          </span>
      );
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row bg-gray-50 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col z-20 flex-shrink-0 shadow-sm">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-3">Rules Navigation</h3>
                <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                    <input 
                        type="text" 
                        placeholder="Search rules..." 
                        className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                            <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredRules.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8 px-4">
                        <i className="fa-solid fa-file-circle-question text-3xl mb-2 text-gray-300"></i>
                        <p>No matching rules found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredRules.map(section => {
                            const isExpanded = expandedSection === section.id || searchTerm.length > 0;
                            // Only Introduction and Credits are treated as special atomic blocks now. Glossary is expandable.
                            const isSpecial = ["Introduction", "Credits"].includes(section.id);
                            const isGlossary = section.id === "Glossary";
                            
                            return (
                                <div key={section.id} className="bg-white">
                                    <button
                                        onClick={() => {
                                            if (isSpecial) {
                                                scrollToAnchor(`section-${section.id}`);
                                            } else {
                                                setExpandedSection(expandedSection === section.id ? null : section.id);
                                                if (expandedSection !== section.id) {
                                                    setTimeout(() => scrollToAnchor(`section-${section.id}`), 50);
                                                }
                                            }
                                        }}
                                        className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between transition-colors ${
                                            expandedSection === section.id ? 'bg-primary/5 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="truncate pr-2">
                                            {isSpecial || isGlossary ? section.title : `${section.id}. ${section.title}`}
                                        </span>
                                        {!isSpecial && (
                                            <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}></i>
                                        )}
                                    </button>
                                    
                                    {/* Subsections List */}
                                    {isExpanded && !isSpecial && (
                                        <div className="bg-gray-50 border-t border-gray-100">
                                            {section.subsections.map(sub => (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => scrollToAnchor(`subsection-${sub.id}`)}
                                                    className="w-full text-left pl-8 pr-4 py-2 text-xs text-gray-600 hover:text-primary hover:bg-gray-100 border-l-2 border-transparent hover:border-primary transition-all truncate flex items-center"
                                                >
                                                    {section.id !== 'Glossary' && <span className="font-mono font-semibold mr-2">{sub.id}</span>}
                                                    {sub.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-8 scroll-smooth" id="rules-container">
            <div className="max-w-4xl mx-auto space-y-8 pb-32">
                <div className="text-center mb-10 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fa-solid fa-book-open text-3xl text-primary"></i>
                    </div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Magic: The Gathering</h1>
                    <h2 className="text-xl text-gray-500 font-medium mt-1">Comprehensive Rules</h2>
                    <div className="flex items-center justify-center gap-2 mt-4 text-xs font-mono text-gray-400 uppercase tracking-wider">
                        <span className="px-2 py-1 bg-gray-50 rounded border border-gray-100">Effective Nov 14, 2025</span>
                    </div>
                </div>

                {filteredRules.map(section => (
                    <div key={section.id} id={`section-${section.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden scroll-mt-6">
                        <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-200 flex items-center gap-4 sticky top-0 z-10 backdrop-blur-md">
                            {!["Introduction", "Glossary", "Credits"].includes(section.id) ? (
                                <span className="text-2xl font-black text-gray-300 select-none">{section.id}</span>
                            ) : (
                                <i className={`fa-solid ${section.id === 'Glossary' ? 'fa-spell-check' : section.id === 'Credits' ? 'fa-users' : 'fa-info-circle'} text-xl text-gray-300`}></i>
                            )}
                            <h2 className="text-xl font-bold text-gray-800">{section.title}</h2>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {section.subsections.map(sub => (
                                <div key={sub.id} id={`subsection-${sub.id}`} className="scroll-mt-32 group">
                                    {/* Subsection Title */}
                                    {sub.title && !["intro", "glossary", "credits"].includes(sub.id) && (
                                        <h3 className="font-bold text-primary text-lg mb-4 flex items-center gap-2 pb-2 border-b border-gray-100">
                                            {section.id !== 'Glossary' ? (
                                                <span className="font-mono bg-primary/10 px-2 py-0.5 rounded text-base">{sub.id}</span>
                                            ) : (
                                                <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold">{sub.title}</span>
                                            )}
                                            {section.id !== 'Glossary' && highlightText(sub.title, searchTerm)}
                                        </h3>
                                    )}
                                    
                                    {/* Subsection Content */}
                                    <div className="space-y-3 text-gray-700 text-sm leading-relaxed">
                                        {sub.content.length > 0 ? (
                                            sub.content.map((line, idx) => {
                                                // 1. Check for standard rule numbers (e.g., "100.1a")
                                                const ruleMatch = line.match(/^(\d{3}\.\d+[a-z]?)/);
                                                
                                                if (ruleMatch) {
                                                    const ruleNum = ruleMatch[1];
                                                    const rest = line.substring(ruleNum.length);
                                                    
                                                    // Determine indentation based on sub-rule depth (letters vs numbers)
                                                    const isSubRule = /[a-z]$/.test(ruleNum);
                                                    const paddingClass = isSubRule ? "pl-8" : "pl-0";

                                                    return (
                                                        <div key={idx} className={`${paddingClass} relative group/line hover:bg-yellow-50/50 transition-colors rounded px-2 -mx-2 py-1`}>
                                                            <span className="font-bold text-gray-900 mr-2">{ruleNum}</span>
                                                            {highlightText(rest, searchTerm)}
                                                        </div>
                                                    );
                                                }
                                                
                                                // 2. Handle Glossary Terms
                                                if (section.id === "Glossary" && isGlossaryTerm(line)) {
                                                     return (
                                                        <p key={idx} className="font-bold text-gray-900 mt-6 text-base border-b border-gray-100 pb-1 mb-2 first:mt-0">
                                                            {highlightText(line, searchTerm)}
                                                        </p>
                                                     );
                                                }
                                                
                                                // 3. Regular Text (Introduction, Credits, or Glossary definition)
                                                // Indent glossary definitions slightly
                                                const pClass = section.id === "Glossary" ? "pl-4 text-gray-600" : "";
                                                return <p key={idx} className={pClass}>{highlightText(line, searchTerm)}</p>;
                                            })
                                        ) : (
                                            <p className="text-gray-400 italic text-xs">No text content.</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                {filteredRules.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <i className="fa-solid fa-magnifying-glass text-4xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500 text-lg">No rules found matching "{searchTerm}"</p>
                        <button 
                            onClick={() => setSearchTerm('')}
                            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Clear Search
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
