import { memo, useState } from "react";

import type { FlashcardResponseDTO } from "../../types";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

interface FlashcardCardProps {
  flashcard: FlashcardResponseDTO;
}

/**
 * Displays a single flashcard with flip animation.
 * Shows English sentence on front, Polish translation on back.
 * Memoized to prevent unnecessary re-renders in the list.
 */
export const FlashcardCard = memo(function FlashcardCard({ flashcard }: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleFlip();
    }
  };

  const formattedDate = new Date(flashcard.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="perspective-1000 h-52 cursor-pointer"
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Flashcard: ${flashcard.sentence_en}. Click to flip.`}
    >
      <div
        className={`relative h-full w-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front side - English */}
        <Card
          className="absolute inset-0 flex flex-col backface-hidden border-2 border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg hover:shadow-xl transition-shadow"
          style={{ backfaceVisibility: "hidden" }}
        >
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                English
              </span>
              <div className="flex gap-1.5">
                {flashcard.source === "ai" && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    AI
                  </Badge>
                )}
                {flashcard.is_edited && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    Edited
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-lg font-medium text-foreground leading-relaxed text-center flex-1 flex items-center justify-center">
              {flashcard.sentence_en}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formattedDate}</span>
              <span className="italic">Click to flip</span>
            </div>
          </CardContent>
        </Card>

        {/* Back side - Polish */}
        <Card
          className="absolute inset-0 flex flex-col backface-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <CardContent className="flex h-full flex-col justify-between p-5">
            <span className="text-xs font-medium text-primary/70 uppercase tracking-wide">
              Polish
            </span>

            <p className="text-lg font-medium text-foreground leading-relaxed text-center flex-1 flex items-center justify-center">
              {flashcard.translation_pl}
            </p>

            <div className="text-xs text-muted-foreground text-right italic">Click to flip back</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
