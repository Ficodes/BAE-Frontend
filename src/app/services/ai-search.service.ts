import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

// Types for AI Search API
export interface AISearchFilter {
  key: string;
  value: string[];
}

export interface AISearchRequest {
  profile: string;
  text: string;
  score_threshold: number;
  filter: AISearchFilter[];
  auto_filter: boolean;
  limit: number;
  offset?: number;
}

export interface AIAnswerRequest {
  profile: string;
  text: string;
  score_threshold: number;
  filter: AISearchFilter[];
  auto_filter: boolean;
  limit: number;
}

export interface FilterCondition {
  key: string;
  operator?: '=' | '!=' | '<' | '<=' | '>' | '>=';
  value: unknown;
}

export interface FilterSuggestion {
  suggested_query: string;
  suggested_filter?: FilterCondition[];
}

export interface AISearchResponse {
  items: any[];
  total_count: number;
  facets: Record<string, Record<string | number, number>>;
  auto_filter_suggestion?: FilterSuggestion;
}

export interface AIAnswerResponse {
  answer?: string;
  auto_filter_suggestion?: FilterSuggestion;
}

@Injectable({
  providedIn: 'root'
})
export class AiSearchService {
  private apiUrl = environment.AI_SEARCH_API_URL;
  private apiKey = environment.AI_SEARCH_API_KEY;
  private scoreThreshold = environment.AI_SEARCH_SCORE_THRESHOLD;
  private answerMaxItems = environment.AI_SEARCH_ANSWER_MAX_ITEMS;
  private profile = environment.AI_SEARCH_PROFILE;

  constructor() {}

  async search(
    query: string,
    filters: AISearchFilter[] = [],
    autoFilter: boolean = true,
    limit: number = 6,
    offset: number = 0
  ): Promise<AISearchResponse> {
    const request: AISearchRequest = {
      profile: this.profile,
      text: query,
      score_threshold: this.scoreThreshold,
      filter: filters,
      auto_filter: autoFilter,
      limit,
      offset
    };

    const bodyStr = JSON.stringify(request);

    try {
      const fetchResponse = await fetch(`${this.apiUrl}search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: bodyStr
      });

      const responseText = await fetchResponse.text();
      const response: AISearchResponse = JSON.parse(responseText);

      return response || { items: [], total_count: 0, facets: {} };
    } catch (error) {
      console.error('AI Search error:', error);
      return { items: [], total_count: 0, facets: {} };
    }
  }

  async getAnswer(query: string, filters: AISearchFilter[] = []): Promise<string> {
    if (!query.trim()) {
      return '';
    }

    const request: AIAnswerRequest = {
      profile: this.profile,
      text: query,
      score_threshold: this.scoreThreshold,
      filter: filters,
      auto_filter: false,
      limit: this.answerMaxItems
    };

    try {
      const fetchResponse = await fetch(`${this.apiUrl}answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(request)
      });

      const response: AIAnswerResponse = await fetchResponse.json();

      const answer = response?.answer || '';
      return answer;
    } catch (error) {
      console.error('AI Answer error:', error);
      return '';
    }
  }

  async searchWithAnswer(
    query: string,
    filters: AISearchFilter[] = [],
    limit: number = 6,
    offset: number = 0
  ): Promise<{ searchResponse: AISearchResponse; answer: string }> {
    // Run search and answer in parallel
    const [searchResponse, answer] = await Promise.all([
      this.search(query, filters, true, limit, offset),
      this.getAnswer(query, filters)
    ]);

    return { searchResponse, answer };
  }

}
