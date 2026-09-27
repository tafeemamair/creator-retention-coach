import type { FullAnalysis } from "../types";
export interface SaveAnalysisParams {
    userId: string;
    title: string;
    script: string;
    detectedLanguage: string;
    targetLanguage: string;
    platform: string;
    overallScore: number;
    analysisResult: FullAnalysis;
    predictedTimeline: Array<{
        second: number;
        retention: number;
    }>;
    scriptHash: string;
    parentAnalysisId?: string | null;
}
export interface AnalysisRepository {
    saveAnalysis(params: SaveAnalysisParams): Promise<{
        id: string;
    }>;
    getAnalysisById(id: string, userId: string): Promise<FullAnalysis | null>;
    findExistingByHash(userId: string, scriptHash: string, platform: string): Promise<{
        id: string;
        analysis: FullAnalysis;
    } | null>;
}
