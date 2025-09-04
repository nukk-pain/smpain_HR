import { Department, Position, User, UserRole } from '../types';

export interface NewDepartmentData {
  name: string;
  description: string;
  supervisorId: string;
}

export interface NewPositionData {
  title: string;
  description: string;
  department: string;
}

export type TreeUser = User | (User['subordinates'] extends (infer T)[] ? T : never) & { 
  role?: string; 
  subordinates?: TreeUser[] 
};

export interface DepartmentDialogProps {
  open: boolean;
  isEditMode: boolean;
  editingDepartment: Department | null;
  newDepartment: NewDepartmentData;
  users: User[];
  onClose: () => void;
  onSave: (data: NewDepartmentData) => void;
  onDepartmentChange: (data: NewDepartmentData) => void;
}

export interface PositionDialogProps {
  open: boolean;
  isEditMode: boolean;
  editingPosition: Position | null;
  newPosition: NewPositionData;
  departments: Department[];
  onClose: () => void;
  onSave: (data: NewPositionData) => void;
  onPositionChange: (data: NewPositionData) => void;
}

export interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  subMessage?: string;
  onClose: () => void;
  onConfirm: () => void;
}