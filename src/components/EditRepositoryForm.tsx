import { AnnounceRepositoryForm } from './AnnounceRepositoryForm';
import type { RepositoryData } from './AnnounceRepositoryForm';

interface EditRepositoryFormProps {
  repository: RepositoryData;
}

export function EditRepositoryForm({ repository }: EditRepositoryFormProps) {
  return <AnnounceRepositoryForm repository={repository} />;
}