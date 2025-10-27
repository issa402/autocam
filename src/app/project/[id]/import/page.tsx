/**
 * Photo Import Page
 * 
 * This page shows all available photo import sources.
 * Users can choose how they want to import photos.
 */

'use client';

import { useParams } from 'next/navigation';
import PhotoUploadSources from '@/components/PhotoUploadSources';

export default function ImportPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <PhotoUploadSources projectId={projectId} />;
}

