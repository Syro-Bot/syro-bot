export interface Feature {
  name: string;
  tag: string;
  gradient: string;
  description: string;
}

import type { LucideIcon } from 'lucide-react';

export interface AutoModRule {
  id: number;
  title: string;
  description: string;
  messageCount?: number;
  timeWindow?: number;
  joinCount?: number;
  lockdownDuration?: number;
  channelCount?: number;
  roleCount?: number;
  raidType?: 'join' | 'channel' | 'role';
}

export interface RaidTypeInfo {
  icon: LucideIcon;
  color: string;
  label: string;
}

export interface AutoModerationSetupProps {
  feature: Feature;
  onBack: () => void;
  onAdd?: () => void;
}

export interface SpamSetupProps {
  rules: AutoModRule[];
  isDarkMode: boolean;
} 