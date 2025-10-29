import React from 'react';
import {
  Settings,
  HelpCircle,
  Save,
  Upload,
  Download,
  Zap,
  Code,
  Eye,
  Clock,
  Search,
  X,
  Menu,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader,
  Copy,
  Trash2,
  Star,
  BookOpen,
  FileJson,
  Share2,
  RotateCcw,
  Maximize2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Edit,
  Home,
  LogOut,
  User,
  FileText,
  LucideIcon,
} from 'lucide-react';

type IconName =
  | 'settings'
  | 'help'
  | 'save'
  | 'load'
  | 'export'
  | 'generate'
  | 'format'
  | 'history'
  | 'search'
  | 'close'
  | 'menu'
  | 'check'
  | 'error'
  | 'warning'
  | 'info'
  | 'loading'
  | 'code'
  | 'preview'
  | 'download'
  | 'upload'
  | 'copy'
  | 'delete'
  | 'favorite'
  | 'docs'
  | 'json'
  | 'share'
  | 'undo'
  | 'fullscreen'
  | 'next'
  | 'prev'
  | 'add'
  | 'edit'
  | 'home'
  | 'logout'
  | 'user'
  | 'file';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

const iconMap: Record<IconName, LucideIcon> = {
  settings: Settings,
  help: HelpCircle,
  save: Save,
  load: Upload,
  export: Download,
  generate: Zap,
  format: Code,
  history: Clock,
  search: Search,
  close: X,
  menu: Menu,
  check: Check,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader,
  code: Code,
  preview: Eye,
  download: Download,
  upload: Upload,
  copy: Copy,
  delete: Trash2,
  favorite: Star,
  docs: BookOpen,
  json: FileJson,
  share: Share2,
  undo: RotateCcw,
  fullscreen: Maximize2,
  next: ChevronRight,
  prev: ChevronLeft,
  add: Plus,
  edit: Edit,
  home: Home,
  logout: LogOut,
  user: User,
  file: FileText,
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  strokeWidth = 2,
}) => {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      size={size}
      color={color}
      className={className}
      strokeWidth={strokeWidth}
    />
  );
};

export default Icon;