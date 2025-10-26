import { useParams, Navigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { getPageTitle, getPageDescription } from '@/lib/siteConfig';

export default function NipRedirect() {
  const { id } = useParams<{ id: string }>();
  
  useSeoMeta({
    title: getPageTitle('Redirecting...'),
    description: getPageDescription('redirect'),
  });
  
  return <Navigate to={`/${id}`} replace />;
}