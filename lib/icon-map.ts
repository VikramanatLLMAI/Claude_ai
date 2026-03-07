/**
 * Icon Map - Curated Lucide icon name-to-component mapping
 *
 * Provides a safe, curated subset of Lucide icons for use in prompt suggestions
 * and login feature cards. Icons are referenced by string name in the database
 * and resolved to React components at render time.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Pencil,
  BookOpen,
  Code2,
  Home,
  Lightbulb,
  MessageSquare,
  BarChart3,
  FileText,
  Globe,
  Search,
  Sparkles,
  Zap,
  Shield,
  Users,
  Calculator,
  Palette,
  Music,
  Camera,
  Heart,
  Star,
  Rocket,
  Database,
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Gift,
  Coffee,
  Briefcase,
  Paintbrush,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface PromptSuggestion {
  icon: string;   // Lucide icon name
  label: string;  // Display label
  prompt: string; // Full prompt text
}

export interface FeatureCard {
  icon: string;    // Lucide icon name
  title: string;
  subtitle: string;
}

// ============================================
// Icon Maps
// ============================================

/**
 * Curated icons suitable for prompt suggestion chips.
 */
export const SUGGESTION_ICONS: Record<string, LucideIcon> = {
  Pencil,
  BookOpen,
  Code2,
  Home,
  Lightbulb,
  MessageSquare,
  BarChart3,
  FileText,
  Globe,
  Search,
  Sparkles,
  Zap,
  Shield,
  Users,
  Calculator,
  Palette,
  Music,
  Camera,
  Heart,
  Star,
  Rocket,
  Database,
  Mail,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Gift,
  Coffee,
  Briefcase,
  Paintbrush,
};

/**
 * Curated icons for login feature cards (same set as suggestions).
 */
export const FEATURE_CARD_ICONS: Record<string, LucideIcon> = {
  ...SUGGESTION_ICONS,
};

// ============================================
// Helpers
// ============================================

/**
 * Get a Lucide icon component by name.
 * Returns Sparkles as fallback for unknown names.
 */
export function getIcon(name: string): LucideIcon {
  return SUGGESTION_ICONS[name] || Sparkles;
}

/**
 * Get sorted list of all available icon names.
 */
export function getIconNames(): string[] {
  return Object.keys(SUGGESTION_ICONS).sort();
}
