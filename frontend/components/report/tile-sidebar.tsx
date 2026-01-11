"use client"

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
import { DashboardTile, Report } from "@/types/report";
import { Badge } from "@/components/ui/badge";

interface TileSidebarProps {
    availableTiles: DashboardTile[];
    onAddTile: (tile: DashboardTile) => void;
    activeReport?: Report | null;
    addedTileIds?: string[];
    isPending?: boolean;
}

export const TileSidebar: React.FC<TileSidebarProps> = ({
    availableTiles,
    onAddTile,
    activeReport,
    addedTileIds = [],
    isPending = false
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Check if tile already exists in report
    const isTileInReport = (tileId: string) => {
        return activeReport?.tiles?.some(t => t.tile_id === tileId) ?? false;
    };

    return (
        <div className="w-80 border-l h-full flex flex-col bg-background/50 backdrop-blur-sm">
            {/* Header with collapse toggle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 border-b flex items-center justify-between hover:bg-muted/50 transition-colors w-full text-left"
            >
                <div>
                    <h3 className="font-semibold text-lg">Available Tiles</h3>
                    <p className="text-sm text-muted-foreground">{availableTiles.length} tiles available</p>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
            </button>

            {/* Tile list */}
            {isExpanded && (
                <div className="flex-1 overflow-auto">
                    {availableTiles.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8 px-4">
                            No tiles available. Generate a dashboard first.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {availableTiles.map((tile) => {
                                const isInReport = isTileInReport(tile.tile_id);
                                const justAdded = addedTileIds.includes(tile.tile_id);

                                return (
                                    <div
                                        key={`sidebar-${tile.tile_id}`}
                                        className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors group"
                                    >
                                        <div className="flex-1 min-w-0 mr-3">
                                            <p className="font-medium text-sm truncate" title={tile.title}>
                                                {tile.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-xs capitalize">
                                                    {tile.type}
                                                </Badge>
                                                {tile.chart_type && (
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {tile.chart_type}
                                                    </Badge>
                                                )}
                                                {isInReport && !justAdded && (
                                                    <span className="text-xs text-muted-foreground">Added</span>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 rounded-full shrink-0 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-sm"
                                            title="Move tile to Custom Report"
                                            onClick={() => onAddTile(tile)}
                                            disabled={isPending}
                                        >
                                            {justAdded ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
