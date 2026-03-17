import { FilterRule } from '../components/ConfigurationManager';

export interface FilterState {
  enabled: boolean;
  activeRules: FilterRule[];
  lastFilteredCount: number;
  predefinedRules: {
    instagram: FilterRule;
    reddit: FilterRule;
  };
}
