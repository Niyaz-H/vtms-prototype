// Theme Configuration
export interface Theme {
  mode: 'light' | 'dark' | 'auto';
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  border: string;
}

// Layout Configuration
export interface LayoutConfig {
  sidebar: {
    open: boolean;
    width: number;
    collapsible: boolean;
  };
  header: {
    height: number;
    visible: boolean;
  };
  footer: {
    height: number;
    visible: boolean;
  };
  content: {
    padding: number;
  };
}

// Component Props
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  testId?: string;
}

// Loading States
export interface LoadingState {
  loading: boolean;
  message?: string;
  progress?: number;
}

// Error States
export interface ErrorState {
  error: Error | string;
  retry?: () => void;
  message?: string;
}

// Modal Configuration
export interface ModalConfig {
  open: boolean;
  title?: string;
  content?: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  closable?: boolean;
  maskClosable?: boolean;
  onClose?: () => void;
  footer?: React.ReactNode;
}

// Notification Configuration
export interface NotificationConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Table Configuration
export interface TableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sorter?: boolean | ((a: T, b: T) => number);
  filterable?: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  resizable?: boolean;
}

export interface TableConfig<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    showQuickJumper?: boolean;
  };
  selection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  sorting?: {
    field?: string;
    order?: 'asc' | 'desc';
    onChange: (field: string, order: 'asc' | 'desc') => void;
  };
  filtering?: {
    filters: Record<string, any>;
    onChange: (filters: Record<string, any>) => void;
  };
}

// Form Configuration
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'time' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
  disabled?: boolean;
  visible?: boolean;
  dependent?: {
    field: string;
    value: any;
  };
}

export interface FormConfig {
  fields: FormField[];
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  loading?: boolean;
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onReset?: () => void;
  onChange?: (field: string, value: any) => void;
}

// Chart Configuration
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'scatter';
  data: ChartData;
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled?: boolean;
      };
    };
    scales?: {
      x?: {
        display?: boolean;
        title?: string;
      };
      y?: {
        display?: boolean;
        title?: string;
        min?: number;
        max?: number;
      };
    };
  };
}

// Responsive Breakpoints
export interface Breakpoints {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

// Animation Configuration
export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  delay?: number;
  fill?: 'forwards' | 'backwards' | 'both' | 'none';
}

// Accessibility Configuration
export interface AccessibilityConfig {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
}

// Viewport Size
export interface ViewportSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

// Device Information
export interface DeviceInfo {
  userAgent: string;
  language: string;
  timezone: string;
  online: boolean;
  cookieEnabled: boolean;
  doNotTrack: boolean;
}