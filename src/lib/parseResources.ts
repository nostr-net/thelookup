import { Globe, Users, Zap, BookOpen, Shield, Hash, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { createElement } from 'react';

export interface Resource {
  name: string;
  url: string;
  description: string;
  icon: ReactNode;
  category: string;
}

// Icon mapping using createElement to avoid JSX in .ts file
const iconMap: Record<string, ReactNode> = {
  'globe': createElement(Globe, { className: "h-6 w-6" }),
  'users': createElement(Users, { className: "h-6 w-6" }),
  'zap': createElement(Zap, { className: "h-6 w-6" }),
  'book-open': createElement(BookOpen, { className: "h-6 w-6" }),
  'shield': createElement(Shield, { className: "h-6 w-6" }),
  'hash': createElement(Hash, { className: "h-6 w-6" }),
  'search': createElement(Search, { className: "h-6 w-6" }),
};

export function parseResourcesMarkdown(markdownContent: string): Resource[] {
  const resources: Resource[] = [];
  
  // Remove code blocks first to avoid parsing examples
  const contentWithoutCodeBlocks = markdownContent.replace(/```[\s\S]*?```/g, '');
  
  // Split by ## headers (resource sections)
  const sections = contentWithoutCodeBlocks.split(/^## /m).filter(section => section.trim());
  
  for (const section of sections) {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) continue;
    
    // First line is the resource name
    const name = lines[0];
    
    // Skip if this is the main title, instructions, or example content
    if (name.includes('Nostr Resources') || 
        name.includes('How to Edit') || 
        name === 'Resource Name' ||
        name.includes('example.com')) {
      continue;
    }
    
    let url = '';
    let description = '';
    let category = '';
    let iconKey = 'globe'; // default icon
    
    // Parse the metadata lines
    for (const line of lines.slice(1)) {
      if (line.startsWith('- **URL**:')) {
        url = line.replace('- **URL**:', '').trim();
      } else if (line.startsWith('- **Description**:')) {
        description = line.replace('- **Description**:', '').trim();
      } else if (line.startsWith('- **Category**:')) {
        category = line.replace('- **Category**:', '').trim();
      } else if (line.startsWith('- **Icon**:')) {
        iconKey = line.replace('- **Icon**:', '').trim();
      }
    }
    
    // Only add if we have the required fields
    if (name && url && description && category) {
      resources.push({
        name,
        url,
        description,
        category,
        icon: iconMap[iconKey] || iconMap['globe'],
      });
    }
  }
  
  return resources;
}

// Category colors mapping
export const categoryColors: Record<string, string> = {
  Official: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Relay: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Tools: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  Client: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Gateway: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
};
