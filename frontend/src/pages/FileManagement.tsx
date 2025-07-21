import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import FileUpload from '../components/FileUpload';

const FileManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        File Management
      </h1>
      
      <Card>
        <CardContent>
          <FileUpload />
        </CardContent>
      </Card>
    </div>
  );
};

export default FileManagement;