import { 
  Smartphone, Globe, Zap, Users, Play, ShoppingCart, Camera, MessageCircle,
  Heart, Star, TrendingUp, Music
} from 'lucide-react';
import React, { createElement } from 'react';
import type { ReactNode } from 'react';

export interface FeaturedApp {
  name: string;
  url: string;
  description: string;
  category: string;
  platform: string;
  icon: ReactNode;
}

// Icon mapping using createElement to avoid JSX in .ts file
const iconMap: Record<string, ReactNode> = {
  'smartphone': createElement(Smartphone, { className: "h-6 w-6" }),
  'globe': createElement(Globe, { className: "h-6 w-6" }),
  'zap': createElement(Zap, { className: "h-6 w-6" }),
  'users': createElement(Users, { className: "h-6 w-6" }),
  'play': createElement(Play, { className: "h-6 w-6" }),
  'shopping-cart': createElement(ShoppingCart, { className: "h-6 w-6" }),
  'camera': createElement(Camera, { className: "h-6 w-6" }),
  'message-circle': createElement(MessageCircle, { className: "h-6 w-6" }),
  'heart': createElement(Heart, { className: "h-6 w-6" }),
  'star': createElement(Star, { className: "h-6 w-6" }),
  'trending-up': createElement(TrendingUp, { className: "h-6 w-6" }),
  'music': createElement(Music, { className: "h-6 w-6" }),
};

export function parseFeaturedAppsMarkdown(markdownContent: string): FeaturedApp[] {
  const apps: FeaturedApp[] = [];
  
  // Remove code blocks first to avoid parsing examples
  const contentWithoutCodeBlocks = markdownContent.replace(/```[\s\S]*?```/g, '');
  
  // Split by ## headers (app sections)
  const sections = contentWithoutCodeBlocks.split(/^## /m).filter(section => section.trim());
  
  for (const section of sections) {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) continue;
    
    // First line is the app name
    const name = lines[0];
    
    // Skip if this is the main title, instructions, or example content
    if (name.includes('Featured Nostr Apps') || 
        name.includes('How to Edit') || 
        name === 'App Name' ||
        name.includes('example.com')) {
      continue;
    }
    
    let url = '';
    let description = '';
    let category = '';
    let platform = '';
    let iconKey = 'smartphone'; // default icon
    
    // Parse the metadata lines
    for (const line of lines.slice(1)) {
      if (line.startsWith('- **URL**:')) {
        url = line.replace('- **URL**:', '').trim();
      } else if (line.startsWith('- **Description**:')) {
        description = line.replace('- **Description**:', '').trim();
      } else if (line.startsWith('- **Category**:')) {
        category = line.replace('- **Category**:', '').trim();
      } else if (line.startsWith('- **Platform**:')) {
        platform = line.replace('- **Platform**:', '').trim();
      } else if (line.startsWith('- **Icon**:')) {
        iconKey = line.replace('- **Icon**:', '').trim();
      }
    }
    
    // Only add if we have the required fields
    if (name && url && description && category) {
      // Check if iconKey is a URL (starts with http)
      const icon = iconKey.startsWith('http') 
        ? createElement('img', { 
            src: iconKey, 
            alt: `${name} icon`,
            className: "h-6 w-6 rounded-sm object-contain",
            onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
              // Fallback to default icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }
          })
        : iconMap[iconKey] || iconMap['smartphone'];

      apps.push({
        name,
        url,
        description,
        category,
        platform: platform || 'Web',
        icon,
      });
    }
  }
  
  return apps;
}

// Category colors mapping
export const appCategoryColors: Record<string, string> = {
  Social: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Client: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Tools: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  Media: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Gaming: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  Marketplace: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  Developer: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
};

// Platform colors mapping
export const platformColors: Record<string, string> = {
  Web: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  iOS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Android: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Desktop: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  All: 'bg-gradient-to-r from-blue-500/10 to-green-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
};
