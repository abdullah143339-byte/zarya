"use client";

import RecommendedPeople from "./RecommendedPeople";
import TrendingList from "./TrendingList";
import CommunitySuggestions from "./CommunitySuggestions";
import AIWidget from "./AIWidget";

export default function RightSidebar() {
  return (
    <div className="space-y-4" aria-label="Right sidebar">
      <RecommendedPeople />
      <TrendingList />
      <CommunitySuggestions />
      <AIWidget />
    </div>
  );
}